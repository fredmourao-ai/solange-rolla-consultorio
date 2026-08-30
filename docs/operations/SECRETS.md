# Secrets and Rotation

This document lists secret names and ownership only. Values belong in the
environment's secret manager, never in Git, issues, PRs, logs or tests.

## Per-environment inventory

| Secret/config | Scope | Purpose | Rotation |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | environment | public project endpoint | when project changes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | environment | browser-safe Supabase key | provider policy or project change |
| `SUPABASE_SECRET_KEY` | server-only environment | privileged workers and server adapters | provider policy; revoke immediately on leak |
| `CLINICAL_ENCRYPTION_KEY_V1` | environment, server-only | L3 envelope encryption | add a new version; retain old versions while envelopes reference them |
| `RATE_LIMIT_HMAC_KEY` | environment, server-only | privacy-safe rate-limit identifiers | coordinated rotation |
| `PUBLIC_ACTION_HMAC_KEY` | environment, server-only | one-time public action token signatures | coordinated rotation; keep distinct from rate-limit key |
| `WHATSAPP_ACCESS_TOKEN` | environment, server-only | WhatsApp adapter | provider policy or leak |
| `EMAIL_PROVIDER_API_KEY` | environment, server-only | email adapter | provider policy or leak |
| `NFSE_*` credentials | environment, server-only | fiscal sandbox/homologation/live adapter | provider policy or leak |
| `WEBHOOK_SIGNING_SECRET_*` | environment, server-only | inbound provider verification | provider policy or leak |

## Rules

- Every staging value differs from its production counterpart.
- Preview receives only disposable project/branch credentials.
- `SUPABASE_SECRET_KEY`, encryption keys and provider tokens never use a
  `NEXT_PUBLIC_` prefix and are never read by client components.
- Encryption rotation adds `CLINICAL_ENCRYPTION_KEY_V<N>` and changes the
  active version; it does not delete a key still referenced by stored data.
- A suspected leak triggers revocation and rotation first. Removing a value
  from Git does not remediate a compromised credential.
- Production live providers remain disabled until the documented go-live gate.

## External provisioning blocker

Secret-manager entries and rotations require account-owner/provider access not
available in this repository execution. No values were generated or recorded.
