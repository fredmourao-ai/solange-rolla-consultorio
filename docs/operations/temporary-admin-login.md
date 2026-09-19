# Temporary admin login — removed

The public `admin` / `admin` alias was removed during the 2026-09-18 extreme audit. It must not be reintroduced in browser code, preview, staging, or production.

Local automated tests may use synthetic fixture credentials inside an isolated local Supabase stack. The canonical staging seed strips the local Auth fixture before calling the remote Management API, so a known local password cannot provision or overwrite a staging user.

Staging requires a separately rotated high-entropy credential supplied through the protected `STAGING_DEMO_PASSWORD` environment secret. Promotion fails closed when that secret is absent or shorter than 32 characters. The credential must match the synthetic staging owner before the public tunnel is enabled.

Production never uses the synthetic demo owner or this staging credential mechanism. No real patient data may be used in staging.