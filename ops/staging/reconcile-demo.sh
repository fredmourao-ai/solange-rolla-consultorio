#!/bin/sh
set -eu

APP=/app
URL_FILE=/state/current-url.txt
PUBLIC_EXPOSURE_FILE=/state/public-exposure-enabled
WEB=solange-client-demo-web

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
app_valid() {
  [ -f "$APP/package.json" ] && [ -f "$APP/.env.production.local" ]
}
current_tunnel_url() {
  docker logs solange-demo-tunnel 2>&1 | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true
}
public_exposure_enabled() {
  [ -f "$PUBLIC_EXPOSURE_FILE" ] && [ "$(cat "$PUBLIC_EXPOSURE_FILE" 2>/dev/null || true)" = true ]
}
ensure_running() {
  state=$(docker inspect -f '{{.State.Status}}' solange-demo-gateway 2>/dev/null || true)
  [ "$state" = running ] || {
    log "starting solange-demo-gateway state=${state:-missing}"
    docker start solange-demo-gateway >/dev/null 2>&1 || true
  }
  if public_exposure_enabled; then
    state=$(docker inspect -f '{{.State.Status}}' solange-demo-tunnel 2>/dev/null || true)
    [ "$state" = running ] || {
      log "starting solange-demo-tunnel state=${state:-missing}"
      docker start solange-demo-tunnel >/dev/null 2>&1 || true
    }
  else
    state=$(docker inspect -f '{{.State.Status}}' solange-demo-tunnel 2>/dev/null || true)
    if [ "$state" = running ]; then
      log 'public exposure disabled; stopping solange-demo-tunnel'
      docker stop solange-demo-tunnel >/dev/null 2>&1 || true
    fi
  fi
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
  public_exposure_enabled || { log 'public exposure disabled; URL reconcile deferred'; return 0; }
  url=$(current_tunnel_url)
  [ -n "$url" ] || { log 'tunnel URL unavailable'; return 0; }
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