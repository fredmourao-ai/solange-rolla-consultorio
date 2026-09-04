#!/bin/sh
set -eu
DEST=${SOLANGE_BACKUP_DEST:-/mnt/fredwin-backup/solange/homologacao}
SOURCE_CONTAINER=${SOLANGE_DB_CONTAINER:-supabase_db_solange-client-demo}
NETWORK=${SOLANGE_DB_NETWORK:-supabase_network_solange-client-demo}
[ -d "$DEST" ] && [ -w "$DEST" ] || { echo 'backup_failed: destination unavailable' >&2; exit 1; }
TS=$(date -u +%Y%m%dT%H%M%SZ)
FULL="$DEST/solange-homologacao-$TS.dump"
APP="$DEST/solange-homologacao-app-auth-$TS.dump"
FULLTMP="$FULL.partial"
APPTMP="$APP.partial"
PW=$(docker inspect "$SOURCE_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p' | head -1)
[ -n "$PW" ] || { echo 'backup_failed: database credential unavailable' >&2; exit 1; }
trap 'rm -f "$FULLTMP" "$APPTMP"' EXIT
docker run --rm --network "$NETWORK" -e PGPASSWORD="$PW" -v "$DEST:/backup" postgres:15-alpine pg_dump -h "$SOURCE_CONTAINER" -U postgres -d postgres -Fc -f "/backup/$(basename "$FULLTMP")"
docker run --rm --network "$NETWORK" -e PGPASSWORD="$PW" -v "$DEST:/backup" postgres:15-alpine pg_dump -h "$SOURCE_CONTAINER" -U postgres -d postgres -Fc -n public -n clinical -n auth -f "/backup/$(basename "$APPTMP")"
docker run --rm -v "$DEST:/backup" alpine sh -lc "chown 1001:1001 '/backup/$(basename "$FULLTMP")' '/backup/$(basename "$APPTMP")'; chmod 600 '/backup/$(basename "$FULLTMP")' '/backup/$(basename "$APPTMP")'"
[ -s "$FULLTMP" ] && [ -s "$APPTMP" ] || { echo 'backup_failed: empty dump' >&2; exit 1; }
mv "$FULLTMP" "$FULL"; mv "$APPTMP" "$APP"
sha256sum "$FULL" > "$FULL.sha256"; sha256sum "$APP" > "$APP.sha256"
chmod 600 "$FULL" "$APP" "$FULL.sha256" "$APP.sha256"
find "$DEST" -maxdepth 1 -type f -name 'solange-homologacao-*.dump' -mtime +14 -delete
find "$DEST" -maxdepth 1 -type f -name 'solange-homologacao-*.dump.sha256' -mtime +14 -delete
printf '%s full=%s restore_subset=%s\n' "$(date -u +%FT%TZ)" "$(basename "$FULL")" "$(basename "$APP")" > "$DEST/LAST_SUCCESS"
chmod 600 "$DEST/LAST_SUCCESS"
echo "backup_success: $(basename "$FULL")"
