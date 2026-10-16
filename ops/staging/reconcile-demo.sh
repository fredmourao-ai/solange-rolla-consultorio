#!/bin/sh
set -eu

APP=/app
URL_FILE=/state/current-url.txt
RELEASE_SHA_FILE=/state/deployed-sha.txt
WEB=solange-client-demo-web

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
app_valid() {
  [ -f "$APP/package.json" ] && [ -f "$APP/.env.production.local" ]
}
current_tunnel_url() {
  # Quick tunnel URLs expire on restart. Reject stopped tunnel logs and
  # ignore URLs from earlier runs of the same Docker container.
  running=$(docker inspect -f '{{.State.Running}}' solange-demo-tunnel 2>/dev/null || true)
  [ "$running" = true ] || return 0
  started=$(docker inspect -f '{{.State.StartedAt}}' solange-demo-tunnel 2>/dev/null || true)
  [ -n "$started" ] || return 0
  # docker logs --since can silently return no rows even for post-start
  # records on the deployed Docker daemon. Use bounded timestamped logs and
  # fail closed on URLs belonging to any older process start (including one
  # started within the same second). Never trust a URL from a previous run.
  docker logs --timestamps --tail 3000 solange-demo-tunnel 2>&1 |
    awk -v started="$started" '
      function key(stamp, fractional) {
        fractional = substr(stamp, 21)
        sub(/[^0-9].*$/, "", fractional)
        return substr(stamp, 1, 19) "." substr(fractional "000000000", 1, 9)
      }
      BEGIN { cutoff = key(started) }
      $1 ~ /^20[0-9][0-9]-/ && key($1) >= cutoff { print }
    ' |
    grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true
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
  app_valid || { log 'app incomplete; URL reconcile deferred'; return 0; }
  url=$(current_tunnel_url)
  [ -n "$url" ] || { log 'tunnel URL unavailable'; return 0; }
  # Do not publish an expired hostname or restart web with a dead APP_URL.
  # docker:27-cli includes getent; guard is DNS-only, no secret-bearing HTTP.
  if ! getent hosts "${url#https://}" >/dev/null 2>&1; then
    log 'tunnel DNS unavailable; URL reconcile deferred'
    return 0
  fi
  # DNS alone is not proof of a live tunnel: Cloudflare can return 401/502,
  # or another process may serve a stale/wrong release on the same hostname.
  # Verify the public HTTPS health and exact deployed SHA before any mutation.
  release_sha=$(cat "$RELEASE_SHA_FILE" 2>/dev/null || true)
  if ! printf '%s\n' "$release_sha" | grep -Eq '^[0-9a-f]{40}$'; then
    log 'release identity invalid; URL reconcile deferred'
    return 0
  fi
  # BusyBox wget follows redirects by default: -S reports every response.
  # Never trust a final 200 reached through a different URL/host.
  header_file=$(mktemp /tmp/solange-staging-health.XXXXXXXX) || return 0
  if ! health_json=$(wget -q -S -T 11 -O - "$url/api/health" 2>"$header_file"); then
    rm -f "$header_file"
    log 'tunnel public health unavailable; URL reconcile deferred'
    return 0
  fi
  http_headers=$(grep -Ec '^[[:space:]]*HTTP/[0-9.]+[[:space:]]+[0-9]{3}([[:space:]]|$)' "$header_file" || true)
  http_ok=$(grep -Ec '^[[:space:]]*HTTP/[0-9.]+[[:space:]]+200([[:space:]]|$)' "$header_file" || true)
  rm -f "$header_file"
  if [ "$http_headers" -ne 1 ] || [ "$http_ok" -ne 1 ]; then
    log 'tunnel public health redirect or unexpected HTTP response; URL reconcile deferred'
    return 0
  fi
  if [ "$(printf '%s' "$health_json" | wc -c)" -gt 8192 ]; then
    log 'tunnel public health payload too large; URL reconcile deferred'
    return 0
  fi
  # Parse top-level identity keys, not substrings or nested/duplicate members.
  # Any escaped key/string fails closed; the health identity is plain ASCII.
  if ! printf '%s\n' "$health_json" | awk -v sha="$release_sha" '
    { payload = payload $0 }
    END {
      n = length(payload)
      if (n < 2 || n > 8192 || index(payload, "\\") > 0) exit 1
      trimmed = payload
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", trimmed)
      if (substr(trimmed, 1, 1) != "{" || substr(trimmed, length(trimmed), 1) != "}") exit 1
      depth = 0; in_string = 0; bad = 0
      for (i = 1; i <= n; i++) {
        ch = substr(payload, i, 1)
        if (ch == "\"") {
          if (in_string) {
            in_string = 0
            if (depth == 1) {
              key = substr(payload, string_start, i - string_start)
              j = i + 1
              while (j <= n && substr(payload, j, 1) ~ /[[:space:]]/) j++
              if (substr(payload, j, 1) == ":" && (key == "status" || key == "buildSha")) {
                j++
                while (j <= n && substr(payload, j, 1) ~ /[[:space:]]/) j++
                if (substr(payload, j, 1) != "\"") { bad = 1; break }
                j++
                k = j
                while (k <= n && substr(payload, k, 1) != "\"") k++
                if (k > n) { bad = 1; break }
                value = substr(payload, j, k - j)
                if (key == "status") {
                  status_count++
                  if (value != "ok") bad = 1
                } else {
                  sha_count++
                  if (value != sha) bad = 1
                }
              }
            }
          } else {
            in_string = 1
            string_start = i + 1
          }
        } else if (!in_string) {
          if (ch == "{" || ch == "[") depth++
          if (ch == "}" || ch == "]") depth--
          if (depth < 0) { bad = 1; break }
        }
      }
      if (bad || depth != 0 || in_string || status_count != 1 || sha_count != 1) exit 1
    }
  '; then
    log 'tunnel public health identity ambiguous or invalid; URL reconcile deferred'
    return 0
  fi

  current=$(sed -n 's/^APP_URL=//p' "$APP/.env.production.local" | tail -1)
  if [ "$current" = "$url" ]; then
    marker_tmp="${URL_FILE}.pending.$$"
    if printf '%s\n' "$url" > "$marker_tmp" && mv -f "$marker_tmp" "$URL_FILE"; then
      return 0
    fi
    rm -f "$marker_tmp"
    log 'tunnel marker write failed; URL reconcile deferred'
    return 0
  fi

  # Change APP_URL only with a reversible snapshot. The public marker is
  # committed *after* the new web process has restarted successfully.
  env_backup=$(mktemp "$APP/.env.production.local.backup.XXXXXXXX") || return 0
  if ! cp -p "$APP/.env.production.local" "$env_backup"; then
    rm -f "$env_backup"
    log 'tunnel env snapshot failed; URL reconcile deferred'
    return 0
  fi
  log 'tunnel URL changed; updating APP_URL'
  if grep -q '^APP_URL=' "$APP/.env.production.local"; then
    if ! sed -i -E "s#^APP_URL=.*#APP_URL=$url#" "$APP/.env.production.local"; then
      cp -p "$env_backup" "$APP/.env.production.local"
      rm -f "$env_backup"
      log 'tunnel env update failed; URL reconcile deferred'
      return 0
    fi
  else
    if ! printf 'APP_URL=%s\n' "$url" >> "$APP/.env.production.local"; then
      cp -p "$env_backup" "$APP/.env.production.local"
      rm -f "$env_backup"
      log 'tunnel env append failed; URL reconcile deferred'
      return 0
    fi
  fi
  if ! docker restart "$WEB" >/dev/null 2>&1; then
    cp -p "$env_backup" "$APP/.env.production.local" || true
    docker restart "$WEB" >/dev/null 2>&1 || true
    rm -f "$env_backup"
    log 'web restart failed; prior APP_URL restored; URL reconcile deferred'
    return 0
  fi
  marker_tmp="${URL_FILE}.pending.$$"
  if ! printf '%s\n' "$url" > "$marker_tmp" || ! mv -f "$marker_tmp" "$URL_FILE"; then
    rm -f "$marker_tmp"
    cp -p "$env_backup" "$APP/.env.production.local" || true
    docker restart "$WEB" >/dev/null 2>&1 || true
    rm -f "$env_backup"
    log 'tunnel marker commit failed; prior APP_URL restored'
    return 0
  fi
  rm -f "$env_backup"
  log 'web restarted and URL marker committed'

}

while :; do
  ensure_running
  reconcile_url
  sleep 60
done
