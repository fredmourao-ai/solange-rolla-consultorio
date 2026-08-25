# Platform Resources

Status: inventory and isolation contract ready. Remote resource creation is
blocked until the account owners provide Supabase and Vercel administrative
access. No credential, project password, or secret is recorded here.

## Canonical resources

| Resource | Canonical name | Environment | Region | Project ref | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Supabase | `solange-rolla-staging` | staging | South America - Sao Paulo (`sa-east-1`) | pending external provisioning | project owner | not provisioned |
| Supabase | `solange-rolla-production` | production | South America - Sao Paulo (`sa-east-1`) | pending external provisioning | project owner | not provisioned |
| Vercel | `solange-rolla-consultorio` | preview/staging/production | managed by Vercel | pending external provisioning | project owner | not linked |

The GitHub repository is `fredmourao-ai/solange-rolla-consultorio`. Final
domains are intentionally not connected at this stage.

## Isolation rules

- Preview and staging must use a non-production Supabase project ref.
- Production must use its own Supabase project ref and encryption key versions.
- Staging and production service-role keys, database passwords and L3 keys are
  always different.
- Production starts empty, with no synthetic operational seed and live
  WhatsApp/NFS-e providers disabled.
- Schema changes are applied only through reviewed forward-only migrations.
- The environment assertion runs in CI and in the manual GitHub
  `Environment Gate` workflow before a remote deployment is allowed. The
  workflow reads only the selected GitHub Environment's secrets and variables.

## Provisioning handoff

When access is available, record only non-secret metadata here: project ref,
region, console URL, creation date and owner. Apply migrations through CI,
verify pgTAP/RLS, and run the production empty-database check before enabling
any operator account.

External blocker: Supabase projects, Vercel project, environment variables and
secret-manager entries cannot be created from this repository without the
corresponding account permissions and credentials.
