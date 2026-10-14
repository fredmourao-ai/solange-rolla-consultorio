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
  if ! health_json=$(wget -q -T 11 -O - "$url/api/health" 2>/dev/null); then
    log 'tunnel public health unavailable; URL reconcile deferred'
    return 0
  fi
  compact_health=$(printf '%s' "$health_json" | tr -d '[:space:]')
  case "$compact_health" in
    *'"status":"ok"'*) ;;
    *) log 'tunnel public health not OK; URL reconcile deferred'; return 0 ;;
  esac
  case "$compact_health" in
    *'"buildSha":"'"$release_sha"'"'*) ;;
    *) log 'tunnel public health wrong release; URL reconcile deferred'; return 0 ;;
  esac

  printf '%s\n' "$url" > "$URL_FILE"
  current=$(sed -n 's/^APP_URL=//p' "$APP/.env.production.local" | tail -1)
  [ "$current" = "$url" ] && return 0

  log "tunnel URL changed; updating APP_URL"
  if grep -q '^APP_URL=' "$APP/.env.production.local"; then
    sed -i -E "s#^APP_URL=.*#APP_URL=$url#" "$APP/.env.production.local"
  else
    printf 'APP_URL=%s\n' "$url" >> "$APP/.env.production.local"
  fi
  docker restart solange-client-demo-web >/dev/null
  log "web restarted for $url"
}

while :; do
  ensure_running
  reconcile_url
  sleep 60
done
