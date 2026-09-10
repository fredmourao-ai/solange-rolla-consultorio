# Temporary admin login

For the current non-production client demo only, the UI accepts the temporary username `admin` with password `admin` when `NEXT_PUBLIC_TEMP_ADMIN_LOGIN_ENABLED=true`. The alias authenticates against the existing synthetic owner fixture; production must leave this flag disabled.

The credential is intentionally temporary and must be replaced before production go-live. No real patient data may be used while this temporary credential remains enabled.
