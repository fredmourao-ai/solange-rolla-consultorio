# Historical State-Transition Audit Hardening

## Goal
Prevent a project from being declared audited or ready when operator-facing state transitions have only been exercised with current-format or freshly seeded data. Every persisted workflow must be tested against the data shapes that actually exist in the environment, including legacy, migrated, partially populated and versioned snapshots.

## Scope
This design extends the existing `AUDIT_POLICY.md`, `docs/quality/EXTREME_AUDIT_PROTOCOL.md`, `docs/DEFINITION_OF_DONE.md` and testing/deployment rules. It does not replace domain-specific overlays. It also defines the minimal policy that must be propagated to every active repository maintained by the owner/organization.

## Canonical rule
For every persisted entity or stateful workflow, an extreme audit must build and execute a matrix crossing:

- operation/state transition: create, read, no-op update, field update, multi-field update, cancel, reopen, archive, restore, retry, undo and every domain transition that exists;
- data provenance: newly created/current-format, pre-migration/legacy, migrated/backfilled, partially populated/null-edge, historical policy/version snapshot, intermediate state and terminal state;
- execution surface: real UI for operator-facing flows, plus API/application/database tests as supporting evidence;
- postcondition: persisted row, audit/history record, dependent state, side effects, idempotency/retry behavior and page reload/reopen.

A category that exists in the real database but is not exercised must remain `NÃO VALIDADO`. A happy-path E2E on fresh seed data cannot certify historical compatibility.

## UI-first requirement
For any routine a secretary, therapist, administrator, operator or customer uses through the product UI, the audit must execute the mutation through the real browser UI. Direct database writes, scripts, Server Action invocation, API calls and unit/integration tests may prepare fixtures or diagnose failures, but they do not replace the UI mutation and the visible post-save verification.

After each mutation, the auditor must reload or revisit the screen and independently verify persisted state. A successful click, HTTP 200, redirect or absence of an exception is insufficient evidence.

## Historical compatibility requirement
When current code reads a versioned JSON snapshot, embedded policy, event payload or denormalized historical structure, one of these guarantees must be proven:

1. all historical rows are migrated/backfilled to the current contract and the migration invariant is verified; or
2. readers/updaters normalize supported historical versions before applying current domain logic.

Silent casts of persisted unvalidated data to current TypeScript/domain types are forbidden as evidence of compatibility.

## Data-shape inventory
Before declaring a workflow covered, query the target environment for the actual distribution of versions, nullability and state. The audit report must record the categories found and sample at least one representative row from every materially different category. If a category is too sensitive or destructive to mutate, reproduce its shape with synthetic data and mark the live category as `NÃO VALIDADO` rather than inferring success.

## Generic server-error rule
Any operator mutation that produces an unhandled 5xx, generic `This page couldn’t load`, blank state, framework error boundary or equivalent is at least P1 for audit/readiness purposes until root cause, affected data class and regression coverage are established. The project cannot be marked `APTO` while such a reproducible mutation remains unresolved.

## Required evidence per workflow
The audit ledger must contain, at minimum:

`Workflow | Data class | Initial state | Operation | UI path | Expected state | Persisted state | Audit/history | Side effects | Reload/reopen | Result | Evidence`

Rows may only be `PASS` when the end-to-end postcondition is directly observed. Untested combinations must be visible as `NÃO VALIDADO`, not omitted.

## Definition-of-Done integration
A change that touches persistence, a state machine, historical policy/versioned data, migrations, editable records or a serializer/deserializer is not done until compatibility with pre-existing records is tested. Bug fixes discovered through historical-data failures must include a regression fixture reproducing the old persisted shape.

## Global propagation
Every active repository maintained by `fredmourao-ai` or `Vivaliz-site` must carry an `AUDIT_POLICY.md` (or an explicit pointer to the canonical policy) and its primary agent instruction file must state that completion/readiness claims require historical-data and state-transition coverage when applicable. Archived repositories are excluded from active enforcement.

Where a repository already has stricter rules, this policy is a floor, not a replacement.

## Governance
Repository governance checks should fail when the canonical audit policy or required references disappear. The rule must be testable from version-controlled files so no agent can silently weaken it through prompt-only instructions.

## Solange Rolla re-audit
The first application of this rule is a contradictory re-audit of the Solange Rolla consultório at the current canonical `main` SHA and its deployed staging SHA. It must, at minimum:

- inventory persisted records by state and historical data shape;
- exercise CRUD/state transitions through the UI across every material category;
- include the Agenda legacy cancellation-policy snapshot regression;
- cover Patients, Agenda, Clinical, Tasks, Forms, Financial/Receivables/Payables, Fiscal, Events, Users/Permissions and reporting/export flows applicable to staging;
- verify audit/history/side effects and reload persistence;
- rerun security/RLS, build, database, E2E, backup/restore, rollback and release provenance gates;
- update `docs/quality/AUDIT_STATUS.md` with explicit debt of evidence rather than treating omitted combinations as pass.

## Success criteria
The work is complete only when the global policy is persisted in all active repositories, the Solange regression is merged and promoted through the canonical pipeline, the re-audit is executed against the exact deployed SHA, and the final status accurately lists every unvalidated area. No `APTO`/`100%` claim is permitted from green CI alone.