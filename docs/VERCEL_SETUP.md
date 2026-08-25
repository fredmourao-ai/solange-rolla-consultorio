# Vercel Setup

## Project contract

- Project name: `solange-rolla-consultorio`
- Repository: `fredmourao-ai/solange-rolla-consultorio`
- Framework: Next.js
- Production domain: not connected before the go-live checklist

## Environment mapping

| Vercel environment | `APP_ENV` | Supabase target | Live providers |
| --- | --- | --- | --- |
| Preview | `preview` | PR branch when Supabase Branching is available; otherwise isolated local/CI only | disabled |
| Staging deployment | `staging` | `solange-rolla-staging` | disabled |
| Production | `production` | `solange-rolla-production` | disabled until `GO_LIVE_APPROVED=true` |

Every environment receives its own values for `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`CLINICAL_ENCRYPTION_KEY_V*`, and provider credentials. Server-only values must
never be exposed as `NEXT_PUBLIC_*` variables.

Before deployment, run `npm run environment:check` with the target environment
variables. A deployment pointing Preview/Staging at production or Production at
staging fails closed.

## Provisioning status

The Vercel project is not linked in this execution because Vercel account
access and environment secrets were not provided. The repository contract and
automated assertion are ready for the owner to provision it without changing
the application code.
