#!/usr/bin/env bash
set -Eeuo pipefail

: "${GITHUB_ENV:?GITHUB_ENV is required}"
if [[ -n "${GITHUB_WORKSPACE:-}" && "$GITHUB_ENV" == "$GITHUB_WORKSPACE/"* ]]; then
  echo "local_e2e_env_file_in_workspace" >&2
  exit 1
fi

# Read only the allowlisted values emitted by the local Supabase CLI.
while IFS='=' read -r key value || [[ -n "${key:-}" ]]; do
  case "$key" in
    API_URL|DB_URL|PUBLISHABLE_KEY|SECRET_KEY)
      if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
        value="${value:1:${#value}-2}"
      fi
      printf -v "$key" '%s' "$value"
      export "$key"
      ;;
  esac
done

: "${API_URL:?local Supabase API_URL is required}"
: "${DB_URL:?local Supabase DB_URL is required}"
: "${PUBLISHABLE_KEY:?local Supabase PUBLISHABLE_KEY is required}"
: "${SECRET_KEY:?local Supabase SECRET_KEY is required}"

# These values are local E2E fixtures only. Never copy them to a managed project.
APP_URL=${APP_URL:-http://127.0.0.1:3000}
APP_ENV=${APP_ENV:-local}
NEXT_PUBLIC_TEMP_ADMIN_LOGIN_ENABLED=${NEXT_PUBLIC_TEMP_ADMIN_LOGIN_ENABLED:-true}
WHATSAPP_LIVE_ENABLED=${WHATSAPP_LIVE_ENABLED:-false}
EMAIL_LIVE_ENABLED=${EMAIL_LIVE_ENABLED:-false}
NFSE_LIVE_ENABLED=${NFSE_LIVE_ENABLED:-false}
CLINICAL_ENCRYPTION_ACTIVE_VERSION=${CLINICAL_ENCRYPTION_ACTIVE_VERSION:-1}
CLINICAL_ENCRYPTION_KEY_V1=${CLINICAL_ENCRYPTION_KEY_V1:-$(printf 'solange-ci-local-e2e-key-0000001' | base64 -w0)}
RATE_LIMIT_HMAC_KEY=${RATE_LIMIT_HMAC_KEY:-solange-ci-local-rate-limit-key-32-bytes}
PUBLIC_ACTION_HMAC_KEY=${PUBLIC_ACTION_HMAC_KEY:-solange-ci-local-public-action-key-32-bytes}
DEMO_LOCAL_EMAIL=${DEMO_LOCAL_EMAIL:-demo.owner@solange.invalid}
DEMO_LOCAL_PASSWORD=${DEMO_LOCAL_PASSWORD:-DemoLocalOnly!2026}

mask_and_export() {
  local name="$1"
  local value="$2"
  local sensitive="$3"
  local command_value
  [[ "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "local_e2e_env_invalid_name" >&2; return 1; }
  [[ -n "$value" && "$value" != *$'\n'* && "$value" != *$'\r'* ]] || {
    echo "local_e2e_env_invalid_value $name" >&2
    return 1
  }

  if [ "$sensitive" = "true" ]; then
    command_value="${value//'%'/'%25'}"
    command_value="${command_value//$'\r'/'%0D'}"
    command_value="${command_value//$'\n'/'%0A'}"
    printf '::add-mask::%s\n' "$command_value"
  fi
  printf '%s=%s\n' "$name" "$value" >> "$GITHUB_ENV"
}

mask_and_export DB_URL "$DB_URL" true
mask_and_export NEXT_PUBLIC_SUPABASE_URL "$API_URL" false
mask_and_export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$PUBLISHABLE_KEY" true
mask_and_export SUPABASE_SECRET_KEY "$SECRET_KEY" true
mask_and_export APP_URL "$APP_URL" false
mask_and_export APP_ENV "$APP_ENV" false
mask_and_export NEXT_PUBLIC_TEMP_ADMIN_LOGIN_ENABLED "$NEXT_PUBLIC_TEMP_ADMIN_LOGIN_ENABLED" false
mask_and_export WHATSAPP_LIVE_ENABLED "$WHATSAPP_LIVE_ENABLED" false
mask_and_export EMAIL_LIVE_ENABLED "$EMAIL_LIVE_ENABLED" false
mask_and_export NFSE_LIVE_ENABLED "$NFSE_LIVE_ENABLED" false
mask_and_export CLINICAL_ENCRYPTION_ACTIVE_VERSION "$CLINICAL_ENCRYPTION_ACTIVE_VERSION" false
mask_and_export CLINICAL_ENCRYPTION_KEY_V1 "$CLINICAL_ENCRYPTION_KEY_V1" true
mask_and_export RATE_LIMIT_HMAC_KEY "$RATE_LIMIT_HMAC_KEY" true
mask_and_export PUBLIC_ACTION_HMAC_KEY "$PUBLIC_ACTION_HMAC_KEY" true
mask_and_export DEMO_LOCAL_EMAIL "$DEMO_LOCAL_EMAIL" false
mask_and_export DEMO_LOCAL_PASSWORD "$DEMO_LOCAL_PASSWORD" true
