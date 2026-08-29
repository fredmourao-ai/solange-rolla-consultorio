# Solange Recovery Memory — 2026-08-29

## Architecture
Production backend/services are consolidated on `always-free-arm-1787907847-26`. The retired E2 hosts are not dependencies. Recovery work uses `recovery/two-a1-20260829` and isolated worktrees.

## Binding rules
- Preserve the current local checkout, bundle provenance and every uncommitted change before normalizing the remote to GitHub.
- Do not overwrite local-only work with GitHub `main`; reconcile both sides after creating verified recovery artifacts.
- No secrets, patient/private data, credentials, keys or tokens may be committed to Git or written to diagnostic logs.
- Validate build/tests plus real critical application flows, persistence and integrations/webhooks.
- Service-active status alone is not proof that Solange works.
- Keep a tested rollback/recovery path before changing the runtime.

## Recovery sources
- Current backend checkout and local recovery bundle/state.
- GitHub history.
- `/home/ubuntu/oci-a1-migration-20260828` and migration staging where applicable.
- Fred Win/Codex operational history where it helps reconstruct configuration decisions.

## Cross-project authority
See `Vivaliz-site/site-shopvivaliz` branch `recovery/two-a1-20260829`:
- `docs/operations/TWO-A1-RECOVERY-SPEC-2026-08-29.md`
- `docs/superpowers/plans/2026-08-29-two-a1-recovery-master.md`

Do not declare Solange recovered until its end-to-end audit and rollback test pass.
