#!/bin/sh
set -eu
: "${BACKUP_FILE:?BACKUP_FILE is required}"
[ -s "$BACKUP_FILE" ] || { echo 'Backup file is missing or empty' >&2; exit 1; }
NAME=solange-restore-drill-$$
DIR=$(dirname "$BACKUP_FILE")
BASE=$(basename "$BACKUP_FILE")
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
START=$(date +%s)
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=restore-only -v "$DIR:/backup:ro" postgres:15-alpine >/dev/null
i=0
until docker logs "$NAME" 2>&1 | grep -q 'PostgreSQL init process complete; ready for start up.'; do
  i=$((i+1))
  [ "$i" -lt 30 ] || { echo 'postgres initialization did not complete in time' >&2; exit 1; }
  sleep 1
done
i=0
until docker exec "$NAME" psql -U postgres -d postgres -Atc 'select 1' >/dev/null 2>&1; do
  i=$((i+1))
  [ "$i" -lt 30 ] || { echo 'postgres final server did not become queryable in time' >&2; exit 1; }
  sleep 1
done
docker exec "$NAME" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'drop schema public; create role authenticated; create role anon; create role service_role;' >/dev/null
docker exec "$NAME" pg_restore -U postgres -d postgres --no-owner --no-privileges "/backup/$BASE"
RESULT=$(docker exec "$NAME" psql -U postgres -d postgres -Atc "select to_regclass('public.profiles') is not null, to_regclass('clinical.records') is not null, to_regclass('auth.users') is not null, (select count(*) from pg_policies)>0;")
[ "$RESULT" = 't|t|t|t' ] || { echo "restore verification failed: $RESULT" >&2; exit 1; }
END=$(date +%s)
echo "restore_success rto_seconds=$((END-START))"
