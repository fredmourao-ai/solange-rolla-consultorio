#!/bin/sh
set -eu
DEST=${SOLANGE_BACKUP_DEST:-/home/ubuntu/solange-client-demo/backups}
SOURCE_CONTAINER=${SOLANGE_DB_CONTAINER:-supabase_db_solange-client-demo}
NETWORK=${SOLANGE_DB_NETWORK:-supabase_network_solange-client-demo}
[ -d "$DEST" ] && [ -w "$DEST" ] || { echo 'backup_failed: destination unavailable' >&2; exit 1; }
TS=$(date -u +%Y%m%dT%H%M%SZ)
FULL="$DEST/solange-homologacao-$TS.dump"; APP="$DEST/solange-homologacao-app-auth-$TS.dump"
FULLTMP="$FULL.partial"; APPTMP="$APP.partial"
[ "$(docker inspect "$SOURCE_CONTAINER" --format '{{.State.Running}}' 2>/dev/null || true)" = true ] || { echo "backup_failed: db_not_running" >&2; exit 1; }
trap 'rm -f "$FULLTMP" "$APPTMP"' EXIT
docker run --rm --user 0:0 --network "container:$SOURCE_CONTAINER" -v "$DEST:/backup" --entrypoint pg_dump postgres:15-alpine -h 127.0.0.1 -U postgres -d postgres -Fc -f "/backup/$(basename "$FULLTMP")"
docker run --rm --user 0:0 --network "container:$SOURCE_CONTAINER" -v "$DEST:/backup" --entrypoint pg_dump postgres:15-alpine -h 127.0.0.1 -U postgres -d postgres -Fc -n public -n clinical -n auth -f "/backup/$(basename "$APPTMP")"
chown 1001:1001 "$FULLTMP" "$APPTMP"
chmod 0600 "$FULLTMP" "$APPTMP"
[ -s "$FULLTMP" ] && [ -s "$APPTMP" ] || { echo 'backup_failed: empty dump' >&2; exit 1; }
mv "$FULLTMP" "$FULL"; mv "$APPTMP" "$APP"
sha256sum "$FULL" > "$FULL.sha256"; sha256sum "$APP" > "$APP.sha256"
printf '%s full=%s restore_subset=%s\n' "$(date -u +%FT%TZ)" "$(basename "$FULL")" "$(basename "$APP")" > "$DEST/LAST_SUCCESS"
chown 1001:1001 "$FULL.sha256" "$APP.sha256" "$DEST/LAST_SUCCESS"
chmod 0600 "$FULL.sha256" "$APP.sha256" "$DEST/LAST_SUCCESS"
find "$DEST" -maxdepth 1 -type f -name 'solange-homologacao-*.dump' -mtime +14 -delete
find "$DEST" -maxdepth 1 -type f -name 'solange-homologacao-*.dump.sha256' -mtime +14 -delete
echo "backup_success: $(basename "$FULL")"
