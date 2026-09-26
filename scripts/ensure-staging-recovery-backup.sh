#!/usr/bin/env bash
set -Eeuo pipefail
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_STAGING_PROJECT_REF:?SUPABASE_STAGING_PROJECT_REF is required}"
ROOT=${STAGING_DEPLOY_ROOT:-/home/ubuntu/solange-client-demo}
RUNTIME_REF=${SUPABASE_PROJECT_REF:-$SUPABASE_STAGING_PROJECT_REF}
[ "$RUNTIME_REF" = "$SUPABASE_STAGING_PROJECT_REF" ] || { echo 'staging_recovery_failed project_ref_mismatch' >&2; exit 1; }

PASSWORD_FILE=${STAGING_DB_PASSWORD_FILE:-$ROOT/state/managed-db-password}
CREDENTIAL_SOURCE=environment
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  if [ -f "$PASSWORD_FILE" ]; then
    [ -O "$PASSWORD_FILE" ] || { echo 'staging_recovery_failed db_password_file_owner' >&2; exit 1; }
    MODE=$(stat -c '%a' "$PASSWORD_FILE")
    [ "$MODE" = 600 ] || { echo 'staging_recovery_failed db_password_file_mode' >&2; exit 1; }
    IFS= read -r SUPABASE_DB_PASSWORD < "$PASSWORD_FILE"
    CREDENTIAL_SOURCE=host-file
  elif [ -n "${SUPABASE_DB_URL:-}" ]; then
    SUPABASE_DB_PASSWORD=$(node <<'NODE'
const rawUrl = process.env.SUPABASE_DB_URL || ''
const projectRef = process.env.SUPABASE_STAGING_PROJECT_REF || ''
let parsed
try { parsed = new URL(rawUrl) } catch { throw new Error('staging_recovery_failed invalid_db_url') }
if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('staging_recovery_failed invalid_db_protocol')
if (['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) throw new Error('staging_recovery_failed local_db_url_forbidden')
const identity = `${parsed.hostname} ${decodeURIComponent(parsed.username)}`
if (!identity.includes(projectRef)) throw new Error('staging_recovery_failed db_project_ref_mismatch')
const password = decodeURIComponent(parsed.password)
if (!password) throw new Error('staging_recovery_failed db_password_missing')
process.stdout.write(password)
NODE
)
    CREDENTIAL_SOURCE=database-url
  else
    echo 'staging_recovery_failed db_password_missing' >&2
    exit 1
  fi
fi
[ "${#SUPABASE_DB_PASSWORD}" -ge 40 ] || { echo 'staging_recovery_failed db_password_too_short' >&2; exit 1; }
export SUPABASE_DB_PASSWORD
unset SUPABASE_DB_URL
echo "staging_recovery_db_credential_ready source=$CREDENTIAL_SOURCE"

DEST=${STAGING_RECOVERY_BACKUP_DEST:-$ROOT/managed-staging-backups}
mkdir -p "$DEST"
chmod 700 "$DEST"
set +e
MANAGED_OUTPUT=$(node scripts/check-managed-staging-backup.mjs 2>&1)
MANAGED_RC=$?
set -e
if [ "$MANAGED_RC" -eq 0 ]; then
  printf '%s\n' "$MANAGED_OUTPUT"
elif printf '%s' "$MANAGED_OUTPUT" | grep -Eq 'STAGING_BACKUP_COMPLETED_NOT_FOUND|STAGING_BACKUP_STALE'; then
  echo 'managed_staging_backup_unavailable logical_export_required=true'
else
  printf '%s\n' "$MANAGED_OUTPUT" >&2
  exit "$MANAGED_RC"
fi
TS=$(date -u +%Y%m%dT%H%M%SZ)
SCHEMA="$DEST/staging-linked-schema-$TS.sql"
DATA="$DEST/staging-linked-data-$TS.sql"
SCHEMA_TMP="$SCHEMA.partial"
DATA_TMP="$DATA.partial"
cleanup(){ rm -f "$SCHEMA_TMP" "$DATA_TMP"; unset SUPABASE_DB_PASSWORD; }
trap cleanup EXIT INT TERM
npx supabase@2.115.0 db dump --project-ref "$SUPABASE_STAGING_PROJECT_REF" --schema public,clinical,auth --file "$SCHEMA_TMP" --yes
npx supabase@2.115.0 db dump --project-ref "$SUPABASE_STAGING_PROJECT_REF" --schema public,clinical,auth --data-only --use-copy --file "$DATA_TMP" --yes
[ -s "$SCHEMA_TMP" ] && [ -s "$DATA_TMP" ] || { echo 'staging_recovery_failed empty_logical_dump' >&2; exit 1; }
chmod 600 "$SCHEMA_TMP" "$DATA_TMP"
mv "$SCHEMA_TMP" "$SCHEMA"
mv "$DATA_TMP" "$DATA"
sha256sum "$SCHEMA" > "$SCHEMA.sha256"
sha256sum "$DATA" > "$DATA.sha256"
chmod 600 "$SCHEMA.sha256" "$DATA.sha256"
SCHEMA_FILE="$SCHEMA" DATA_FILE="$DATA" bash scripts/verify-staging-logical-backup-docker.sh
STORAGE_DIR="$DEST/staging-storage-$TS"
STAGING_STORAGE_BACKUP_DEST="$STORAGE_DIR" node scripts/backup-verify-staging-storage.mjs
printf '%s source=supabase-linked project_ref=%s schema=%s data=%s storage=%s\n' "$(date -u +%FT%TZ)" "$SUPABASE_STAGING_PROJECT_REF" "$(basename "$SCHEMA")" "$(basename "$DATA")" "$(basename "$STORAGE_DIR")" > "$DEST/LAST_SUCCESS"
chmod 600 "$DEST/LAST_SUCCESS"
find "$DEST" -maxdepth 1 -type f -name 'staging-linked-*' -mtime +7 -delete
find "$DEST" -mindepth 1 -maxdepth 1 -type d -name 'staging-storage-*' -mtime +7 -exec rm -rf -- {} +
echo "staging_recovery_backup_ok source=supabase-linked schema=$(basename "$SCHEMA") data=$(basename "$DATA") storage=$(basename "$STORAGE_DIR")"
