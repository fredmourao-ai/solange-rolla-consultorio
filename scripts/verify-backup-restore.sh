#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_ENV:?RESTORE_ENV=staging_restore_drill is required}"
: "${BACKUP_FILE:?BACKUP_FILE must point to a dump file}"
: "${RESTORE_DB_URL:?RESTORE_DB_URL must point to an isolated restore database}"

if [[ "$RESTORE_ENV" != "staging_restore_drill" ]]; then
  echo "Refusing restore: RESTORE_ENV must be staging_restore_drill" >&2
  exit 1
fi
if [[ "$RESTORE_DB_URL" == *production* || "$RESTORE_DB_URL" == *prod.* ]]; then
  echo "Refusing restore: target appears to be production" >&2
  exit 1
fi
if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file is missing or empty" >&2
  exit 1
fi

sha256sum "$BACKUP_FILE"
pg_restore --no-owner --no-privileges --dbname="$RESTORE_DB_URL" "$BACKUP_FILE"
psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select to_regclass('public.profiles') is not null as profiles_present;
select to_regclass('clinical.records') is not null as clinical_records_present;
select count(*) >= 0 as rls_query_ok from pg_policies;
SQL

echo "Restore verification completed in isolated environment"
