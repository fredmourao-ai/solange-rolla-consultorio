#!/bin/sh
# Reconcile the ephemeral public staging URL without trusting stale Docker logs.
# Source identity, patient data, provider secrets and application build are untouched.
set -eu
umask 077

APP=${SOLANGE_RECONCILE_APP:-/app}
STATE_DIR=${SOLANGE_RECONCILE_STATE_DIR:-/state}
URL_FILE="$STATE_DIR/current-url.txt"
WEB=solange-client-demo-web
TUNNEL=solange-demo-tunnel
RENEWED_AT="$STATE_DIR/.tunnel-renewed-at"
COOLDOWN=${SOLANGE_TUNNEL_RESTART_COOLDOWN_SECONDS:-900}
TUNNEL_LOG=

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
app_valid() {
  [ -f "$APP/package.json" ] &&
  [ -f "$APP/.env.production.local" ] &&
  [ ! -L "$APP/.env.production.local" ] &&
  [ -x "$APP/node_modules/.bin/next" ] &&
  [ -s "$APP/.next/BUILD_ID" ]
}

ensure_running() {
  for c in solange-demo-gateway "$TUNNEL"; do
    state=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || true)
    if [ "$state" != running ]; then
      log "starting $c state=${state:-missing}"
      docker start "$c" >/dev/null 2>&1 || true
    fi
  done
  if ! app_valid; then
    log 'app incomplete; web start deferred'
    return 0
  fi
  state=$(docker inspect -f '{{.State.Status}}' "$WEB" 2>/dev/null || true)
  if [ "$state" != running ]; then
    log "starting $WEB state=${state:-missing}"
    docker start "$WEB" >/dev/null 2>&1 || true
  fi
}

load_current_session() {
  started=$(docker inspect --format '{{.State.StartedAt}}' "$TUNNEL" 2>/dev/null || true)
  [ -n "$started" ] || { TUNNEL_LOG=; return 1; }
  # Unbounded docker logs can return defunct Quick Tunnel hostnames.
  TUNNEL_LOG=$(docker logs --since "$started" --tail 240 "$TUNNEL" 2>&1) || {
    TUNNEL_LOG=
    return 1
  }
}

current_tunnel_url() {
  # Only Cloudflare's Quick Tunnel announcement (surrounded by bars) counts.
  printf '%s\n' "$TUNNEL_LOG" |
    sed -n -E 's#^.*[|][[:space:]]*(https://[a-z0-9-]+[.]trycloudflare[.]com)[[:space:]]*[|].*$#\1#p' |
    tail -1
}

public_healthy() {
  case "$1" in https://*.trycloudflare.com) : ;; *) return 1 ;; esac
  # BusyBox wget validates TLS. Redirects must not turn an invalid host green.
  headers=$(wget -S --spider -T 8 "$1/api/health" 2>&1) || return 1
  statuses=$(printf '%s\n' "$headers" |
    sed -n -E 's/^[[:space:]]*HTTP\/[0-9.]+[[:space:]]+([0-9][0-9][0-9]).*/\1/p')
  [ "$statuses" = 200 ]
}

promotion_in_progress() {
  for f in "$STATE_DIR"/deploy-transaction-*; do
    [ -f "$f" ] || continue
    case "$f" in *.rollback-cleared) continue ;; esac
    [ -f "$f.rollback-cleared" ] && continue
    return 0
  done
  return 1
}

renew_revoked_tunnel() {
  printf '%s\n' "$TUNNEL_LOG" | grep -Fq 'Unauthorized: Tunnel not found' || return 0
  if promotion_in_progress; then
    log 'tunnel renewal deferred during staging promotion'
    return 0
  fi
  case "$COOLDOWN" in ''|*[!0-9]*) log 'invalid tunnel renewal cooldown'; return 0 ;; esac
  previous=0
  if [ -e "$RENEWED_AT" ]; then
    previous=$(cat "$RENEWED_AT" 2>/dev/null || true)
    case "$previous" in ''|*[!0-9]*) log 'invalid tunnel renewal state'; return 0 ;; esac
  fi
  now=$(date -u +%s)
  [ "$now" -ge "$previous" ] || return 0
  [ "$((now - previous))" -ge "$COOLDOWN" ] || return 0
  if docker restart "$TUNNEL" >/dev/null 2>&1; then
    printf '%s\n' "$now" > "$RENEWED_AT"
    log 'revoked temporary tunnel renewed; waiting for new public URL'
  else
    log 'temporary tunnel renewal failed; will retry after evidence'
  fi
}

mark_url() {
  file=$(mktemp "$STATE_DIR/.current-url.XXXXXXXX") || return 1
  printf '%s\n' "$1" > "$file"
  mv -f "$file" "$URL_FILE"
}

reconcile_url() {
  app_valid || { log 'app incomplete; URL reconcile deferred'; return 0; }
  if promotion_in_progress; then
    log 'URL reconciliation deferred during staging promotion'
    return 0
  fi
  load_current_session || { log 'current tunnel session unavailable'; return 0; }
  url=$(current_tunnel_url)
  if [ -z "$url" ] || ! public_healthy "$url"; then
    log 'public tunnel invalid; retaining prior deployment config'
    renew_revoked_tunnel
    return 0
  fi
  current=$(sed -n 's/^APP_URL=//p' "$APP/.env.production.local" | tail -1)
  if [ "$current" = "$url" ]; then
    mark_url "$url"
    return 0
  fi

  # Preserve credentials and old URL until the replacement web starts.
  config="$APP/.env.production.local"
  backup=$(mktemp "$APP/.env-pre-url.XXXXXXXX") || return 0
  candidate=$(mktemp "$APP/.env-new-url.XXXXXXXX") || { rm -f "$backup"; return 0; }
  cp -p "$config" "$backup" || { rm -f "$backup" "$candidate"; return 0; }
  sed '/^APP_URL=/d' "$config" > "$candidate" || {
    rm -f "$backup" "$candidate"
    return 0
  }
  printf 'APP_URL=%s\n' "$url" >> "$candidate"
  chmod 600 "$candidate"
  if ! mv -f "$candidate" "$config"; then
    rm -f "$backup" "$candidate"
    return 0
  fi
  if ! docker restart solange-client-demo-web >/dev/null 2>&1; then
    mv -f "$backup" "$config"
    log 'web restart failed; previous APP_URL restored'
    return 0
  fi
  rm -f "$backup"
  mark_url "$url"
  log 'public URL committed after TLS/HTTP validation and successful web restart'
}

run_once() {
  ensure_running
  reconcile_url
}

case "${1:-}" in --once|'') : ;; *) log 'invalid option'; exit 2 ;; esac
case "${1:-}" in
  --once) run_once ;;
  *) while :; do run_once; sleep 60; done ;;
esac
