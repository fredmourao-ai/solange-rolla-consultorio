#!/bin/sh
set -eu
: "${BACKUP_FILE:?BACKUP_FILE is required}"
[ -s "$BACKUP_FILE" ] || { echo 'Backup file is missing or empty' >&2; exit 1; }
NAME=solange-restore-drill-$$
DIR=$(dirname "$BACKUP_FILE")
BASE=$(basename "$BACKUP_FILE")
IMAGE=public.ecr.aws/supabase/postgres:15.8.1.085
RESTORE_DB=solange_restore
RESTORE_ROLE=supabase_admin
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
START=$(date +%s)
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=restore-only -v "$DIR:/backup:ro" "$IMAGE" >/dev/null
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
docker exec -e PGPASSWORD=restore-only "$NAME" createdb -U "$RESTORE_ROLE" -T template0 "$RESTORE_DB"
docker exec -e PGPASSWORD=restore-only "$NAME" psql -U "$RESTORE_ROLE" -d "$RESTORE_DB" -v ON_ERROR_STOP=1 -c 'drop schema public;'
docker exec -e PGPASSWORD=restore-only "$NAME" pg_restore -U "$RESTORE_ROLE" -d "$RESTORE_DB" --no-owner --no-privileges --exit-on-error "/backup/$BASE"
RESULT=$(docker exec -e PGPASSWORD=restore-only "$NAME" psql -U "$RESTORE_ROLE" -d "$RESTORE_DB" -Atc "select to_regclass('public.profiles') is not null, to_regclass('clinical.records') is not null, to_regclass('auth.users') is not null, (select count(*) from pg_policies)>0;")
[ "$RESULT" = 't|t|t|t' ] || { echo "restore verification failed: $RESULT" >&2; exit 1; }
END=$(date +%s)
echo "restore_success rto_seconds=$((END-START))"
