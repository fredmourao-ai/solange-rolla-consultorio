# Historical State-Transition Audit Implementation Plan

**Goal:** Make historical-data/state-transition coverage a persistent audit gate across active repositories, fix the Agenda legacy-snapshot regression canonically, and re-audit Solange against the exact deployed SHA.

**Architecture:** Keep `docs/quality/EXTREME_AUDIT_PROTOCOL.md` as the detailed protocol, `AUDIT_POLICY.md` as activation gate, and `docs/quality/AUDIT_RUNTIME_PARITY_V1.md` as published-runtime parity gate. Enforce historical compatibility through agent policy, Definition of Done, architecture tests and real-UI homologation.

## Tasks

- [x] Persist the global historical state-transition rule in all active repositories without weakening stricter local policy.
- [x] Reproduce the Agenda historical snapshot defect and the broader unsafe-cast class with RED regression/governance evidence.
- [x] Add a validated historical snapshot normalizer and use it in Agenda edit, Agenda status/billing and Clinical appointment readers.
- [x] Add real-UI regression scenarios for legacy edit, current no-op edit and legacy late-cancellation billing with reload/reopen checks.
- [ ] Bind those historical UI scenarios to the canonical staging acceptance workflow.
- [ ] Pass lint, typecheck, architecture/modules, focused tests, full unit/integration, DB and build gates.
- [ ] Merge through canonical branch protection and promote the exact merged SHA to staging.
- [ ] Execute published real-UI contradictory audit against that exact SHA and inventory real staging data shapes.
- [ ] Execute/verify security/RLS, worker health, release provenance, backup/restore and rollback gates; record any unavailable evidence as `NÃO VALIDADO`.
- [ ] Publish `docs/quality/2026-09-16-state-transition-matrix.md` and update `docs/quality/AUDIT_STATUS.md` with exact SHA, findings, evidence debt and final readiness status.

## Completion
Green CI is necessary but insufficient. Completion requires exact-SHA published evidence and an honest final status; omitted combinations remain `NÃO VALIDADO` rather than implicit pass.
