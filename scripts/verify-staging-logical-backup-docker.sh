#!/usr/bin/env bash
set -Eeuo pipefail
: "${SCHEMA_FILE:?SCHEMA_FILE is required}"
: "${DATA_FILE:?DATA_FILE is required}"
[ -s "$SCHEMA_FILE" ] || { echo 'staging_restore_failed schema_missing' >&2; exit 1; }
[ -s "$DATA_FILE" ] || { echo 'staging_restore_failed data_missing' >&2; exit 1; }
NAME="solange-staging-restore-drill-$$"
IMAGE=public.ecr.aws/supabase/postgres:15.8.1.085
RESTORE_DB=solange_restore
DIR=$(dirname "$SCHEMA_FILE")
SCHEMA_BASE=$(basename "$SCHEMA_FILE")
DATA_BASE=$(basename "$DATA_FILE")
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
START=$(date +%s)
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=restore-only -v "$DIR:/backup:ro" "$IMAGE" >/dev/null
for _ in $(seq 1 45); do
  docker exec "$NAME" psql -U postgres -d postgres -Atc 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$NAME" psql -U postgres -d postgres -Atc 'select 1' >/dev/null
docker exec "$NAME" createdb -U supabase_admin -T template0 "$RESTORE_DB"
docker exec "$NAME" psql -U supabase_admin -d "$RESTORE_DB" -v ON_ERROR_STOP=1 -c 'drop schema public;'
docker exec "$NAME" psql -U supabase_admin -d "$RESTORE_DB" -v ON_ERROR_STOP=1 -f "/backup/$SCHEMA_BASE" >/dev/null
docker exec "$NAME" psql -U supabase_admin -d "$RESTORE_DB" -v ON_ERROR_STOP=1 -f "/backup/$DATA_BASE" >/dev/null
RESULT=$(docker exec "$NAME" psql -U supabase_admin -d "$RESTORE_DB" -Atc "select to_regclass('public.profiles') is not null, to_regclass('clinical.records') is not null, to_regclass('auth.users') is not null, (select count(*) from pg_policies)>0;")
[ "$RESULT" = 't|t|t|t' ] || { echo "staging_restore_failed contract=$RESULT" >&2; exit 1; }
INTEGRITY=$(docker exec "$NAME" psql -U supabase_admin -d "$RESTORE_DB" -Atc "select (select count(*)>0 from auth.users), not exists(select 1 from public.profiles p left join auth.users u on u.id=p.user_id where u.id is null), not exists(select 1 from public.audit_events a left join auth.users u on u.id=a.actor_user_id where a.actor_user_id is not null and u.id is null), not exists(select 1 from clinical.records r left join auth.users u on u.id=r.author_user_id where r.author_user_id is not null and u.id is null), not exists(select 1 from pg_constraint where contype='f' and not convalidated);")
[ "$INTEGRITY" = 't|t|t|t|t' ] || { echo "staging_restore_failed integrity=$INTEGRITY" >&2; exit 1; }
echo "staging_restore_success rto_seconds=$(( $(date +%s) - START ))"
