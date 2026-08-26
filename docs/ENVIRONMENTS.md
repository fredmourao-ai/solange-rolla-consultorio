# Environment Isolation

The application accepts exactly five values for `APP_ENV`:

`local`, `test`, `preview`, `staging`, and `production`.

Production is never used for development, preview, database tests, or synthetic
smoke tests. Remote environments use distinct Supabase project references and
distinct secrets. Provider live flags remain disabled outside production.

## Operating modes

### Mode A: Preview branch

When the Supabase project and plan expose Branching/Preview Branches, each
eligible pull request receives a disposable database branch. The branch is
created from the repository migrations, populated only with the synthetic seed,
and connected to the matching Vercel Preview environment. The association is
`GitHub PR -> Vercel Preview -> Supabase Preview Branch`.

The preview workflow is opt-in through the GitHub variable
`SUPABASE_BRANCHING_ENABLED=true` and requires explicit preview credentials.
Without those values the workflow is skipped and the main CI remains valid.

### Mode B: local/CI plus serialized staging

This repository currently uses Mode B until Supabase Branching capability is
confirmed for the provisioned project. Each agent uses its own local Supabase
stack and each CI job starts a clean database. The shared staging environment
accepts only an explicitly selected, reviewed commit through the serialized
staging workflow.

Staging migrations are forward-only. `db reset` is allowed only for local, CI,
and disposable preview databases. Staging is never used concurrently by
multiple agents and never receives SQL that is not committed to this repository.

## Synthetic data

`supabase/seed.sql` is the source for local, CI, and preview fixtures. It is
currently intentionally empty because no domain-owned tables exist yet. Domain
plans must add only synthetic records, using the manifest and verifier in
`tests/fixtures/seed-manifest.json` and `scripts/verify-synthetic-seed.mjs`.

No production clone or real patient data is permitted. Preview branches and
local databases are disposable. Closing or merging a PR makes its preview
branch eligible for platform cleanup; cleanup must never target staging or
production references.

## Required environment separation

- `local` and `test`: no remote project is required; live providers are off.
- `preview`: a dedicated allowlisted preview project/branch; live providers off.
- `staging`: the dedicated staging project; live providers off.
- `production`: the dedicated production project; live providers require the
  explicit go-live gate.

The executable checks are `npm run environment:check` and
`npm run seed:check`.
