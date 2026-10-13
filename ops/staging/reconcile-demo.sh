#!/bin/sh
set -eu

# Fail-closed quick-tunnel reconciliation. A running container is not proof
# of DNS, TLS, HTTP, JSON, or the identity of the publicly served release.
APP=${SOLANGE_APP_DIR:-/app}
URL_FILE=${SOLANGE_PUBLIC_URL_FILE:-/state/current-url.txt}
DEPLOYED_SHA_FILE=${SOLANGE_DEPLOYED_SHA_FILE:-/state/deployed-sha.txt}
PUBLIC_STATUS_FILE=${SOLANGE_PUBLIC_STATUS_FILE:-/state/public-health-status.txt}
WEB=solange-client-demo-web

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
app_valid() {
  [ -f "$APP/package.json" ] && [ -f "$APP/.env.production.local" ]
}
current_tunnel_url() {
  docker logs solange-demo-tunnel 2>&1 | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true
}
valid_sha() {
  printf '%s\n' "$1" | grep -Eq '^[a-f0-9]{40}$'
}
verify_public_release() {
  url=$1
  expected=$2
  valid_sha "$expected" || return 1
  printf '%s\n' "$url" | grep -Eq '^https://[a-z0-9-]+\.trycloudflare\.com$' || return 1
  host=${url#https://}
  # DNS lookup must succeed now, and wget must verify TLS and return 2xx.
  getent hosts "$host" >/dev/null 2>&1 || return 1
  # Use a single HTTPS response with strict certificate and JSON validation.
  # BusyBox wget in docker:27-cli lacks --tries and can vary TLS behavior.
  # The existing web container has Node 24 and the same staging network.
  actual=$(
    docker exec "$WEB" node -e '
      const https = require("node:https");
      const endpoint = new URL(process.argv[1] + "/api/health");
      let seen = 0;
      const request = https.get(endpoint, {
        rejectUnauthorized: true,
        timeout: 8000,
      }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          process.exitCode = 1;
          return;
        }
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          seen += Buffer.byteLength(chunk, "utf8");
          if (seen > 16384) {
            request.destroy(new Error("health_response_too_large"));
            return;
          }
          raw += chunk;
        });
        response.on("end", () => {
          try {
            const obj = JSON.parse(raw);
            if (!obj || Array.isArray(obj) || typeof obj !== "object" ||
                obj.status !== "ok" || obj.environment !== "staging" ||
                typeof obj.buildSha !== "string" ||
                !/^[a-f0-9]{40}$/.test(obj.buildSha)) {
              process.exitCode = 1;
              return;
            }
            process.stdout.write(obj.buildSha);
          } catch {
            process.exitCode = 1;
          }
        });
        response.on("error", () => { process.exitCode = 1; });
      });
      request.on("timeout", () => {
        request.destroy(new Error("health_timeout"));
      });
      request.on("error", () => { process.exitCode = 1; });
    ' "$url" 2>/dev/null
  ) || return 1
  [ "$actual" = "$expected" ]
}
write_public_status() {
  value=$1
  tmp="${PUBLIC_STATUS_FILE}.tmp.$$"
  printf '%s\n' "$value" > "$tmp"
  mv "$tmp" "$PUBLIC_STATUS_FILE"
}
invalidate_public() {
  reason=$1
  # Never leave a stale hostname advertised as a healthy public endpoint.
  rm -f "$URL_FILE"
  write_public_status UNHEALTHY
  log "public_health=UNHEALTHY reason=$reason"
}
restore_previous_app_url() {
  previous=$1
  if [ -n "$previous" ]; then
    sed -i -E "s#^APP_URL=.*#APP_URL=$previous#" "$APP/.env.production.local"
  else
    sed -i '/^APP_URL=/d' "$APP/.env.production.local"
  fi
  docker restart solange-client-demo-web >/dev/null 2>&1 || true
  log 'public_health=UNHEALTHY compensated_APP_URL'
}
ensure_running() {
  for c in solange-demo-gateway solange-demo-tunnel; do
    state=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || true)
    [ "$state" = running ] || {
      log "starting $c state=${state:-missing}"
      docker start "$c" >/dev/null 2>&1 || true
    }
  done
  if ! app_valid; then
    log 'app incomplete; web start deferred'
    return 0
  fi
  state=$(docker inspect -f '{{.State.Status}}' "$WEB" 2>/dev/null || true)
  [ "$state" = running ] || {
    log "starting $WEB state=${state:-missing}"
    docker start "$WEB" >/dev/null 2>&1 || true
  }
}
reconcile_url() {
  app_valid || { invalidate_public app_incomplete; return 1; }
  [ -s "$DEPLOYED_SHA_FILE" ] || { invalidate_public missing_release_identity; return 1; }
  expected=$(cat "$DEPLOYED_SHA_FILE" | tr -d '\r\n')
  valid_sha "$expected" || { invalidate_public invalid_release_identity; return 1; }
  url=$(current_tunnel_url)
  [ -n "$url" ] || { invalidate_public tunnel_url_missing; return 1; }
  if ! verify_public_release "$url" "$expected"; then
    invalidate_public tunnel_dns_tls_http_or_release_mismatch
    return 1
  fi

  current=$(sed -n 's/^APP_URL=//p' "$APP/.env.production.local" | tail -1)
  if [ "$current" != "$url" ]; then
    log 'public_health=PROBED updating APP_URL'
    if grep -q '^APP_URL=' "$APP/.env.production.local"; then
      sed -i -E "s#^APP_URL=.*#APP_URL=$url#" "$APP/.env.production.local"
    else
      printf 'APP_URL=%s\n' "$url" >> "$APP/.env.production.local"
    fi
    if ! docker restart solange-client-demo-web >/dev/null; then
      restore_previous_app_url "$current"
      invalidate_public web_restart_failed
      return 1
    fi
    if ! verify_public_release "$url" "$expected"; then
      restore_previous_app_url "$current"
      invalidate_public post_restart_public_health_failed
      return 1
    fi
  fi
  # Publish the URL only after proving the final public behavior.
  url_tmp="$URL_FILE.tmp.$$"
  printf '%s\n' "$url" > "$url_tmp"
  mv "$url_tmp" "$URL_FILE"
  write_public_status HEALTHY
}

case "${1:-}" in
  --probe-public)
    [ "$#" -eq 3 ] || exit 2
    verify_public_release "$2" "$3"
    exit $?
    ;;
  --once)
    ensure_running
    reconcile_url
    exit $?
    ;;
  "")
    ;;
  *)
    log 'unsupported reconciler operation'
    exit 2
    ;;
esac

while :; do
  ensure_running
  reconcile_url || true
  sleep 60
done
