# Solange — recovery memory

Read before changing code, deploy, dependencies or infrastructure.

- Current production/recovery architecture uses the two surviving OCI A1 VMs only; retired E2 hosts/IPs are historical and must not return to executable configuration.
- Recovered webhook work was reconciled onto current `main`. Recovery verification passed 207 tests, typecheck, lint, dependency architecture, module contracts, migration check and Next production build.
- Preserve dirty work and backups before reset/cleanup. GitHub `main` is canonical for published history.
- Never print or commit secrets.
- Dependabot must not create automatic PR debt: `.github/dependabot.yml` requires `open-pull-requests-limit: 0` for npm and GitHub Actions. `tests/dependabot-no-pr-contract.test.mjs` is the regression guard.
- Dependabot PRs #4-#8 were closed without merge on 2026-08-31. Do not automatically apply major dependency upgrades without isolated compatibility testing.
- GitHub Actions may be blocked before jobs start by account billing/spending-limit state; treat that as external infrastructure rather than changing code to make the check disappear.
- Keep pull-request debt at zero: merge only after green gates or close while preserving evidence.
- Do not weaken fail-closed safety/governance gates merely to clear CI.

Cross-project final checkpoint: `Vivaliz-site/site-shopvivaliz` → `docs/operations/recovery/2026-08-31-final-verification.md`.
