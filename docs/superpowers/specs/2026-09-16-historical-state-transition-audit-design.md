# Historical State-Transition Audit Hardening

## Goal
Prevent a project from being declared audited or ready when operator-facing state transitions have only been exercised with current-format or freshly seeded data. Every persisted workflow must be tested against the data shapes that actually exist in the environment, including legacy, migrated, partially populated and versioned snapshots.

## Canonical rule
For every persisted entity or stateful workflow, an extreme audit must build and execute a matrix crossing:

- operation/state transition: create, read, no-op update, field update, multi-field update, cancel, reopen, archive, restore, retry, undo and every domain transition that exists;
- data provenance: newly created/current-format, pre-migration/legacy, migrated/backfilled, partially populated/null-edge, historical policy/version snapshot, intermediate state and terminal state;
- execution surface: real UI for operator-facing flows, plus API/application/database tests as supporting evidence;
- postcondition: persisted row, audit/history record, dependent state, side effects, idempotency/retry behavior and page reload/reopen.

A category that exists in the real database but is not exercised must remain `NÃO VALIDADO`. A happy-path E2E on fresh seed data cannot certify historical compatibility.

## UI-first requirement
For any routine a secretary, therapist, administrator, operator or customer uses through the product UI, the audit must execute the mutation through the real browser UI. Direct database writes, scripts, Server Action invocation, API calls and unit/integration tests may prepare fixtures or diagnose failures, but they do not replace the UI mutation and visible post-save verification.

After each mutation, reload or revisit the screen and independently verify persisted state. A successful click, HTTP 200, redirect or absence of an exception is insufficient evidence.

## Historical compatibility requirement
When current code reads a versioned JSON snapshot, embedded policy, event payload or denormalized historical structure, one of these guarantees must be proven:

1. all historical rows are migrated/backfilled to the current contract and the migration invariant is verified; or
2. readers/updaters normalize supported historical versions before applying current domain logic.

Silent casts of persisted unvalidated data to current TypeScript/domain types are forbidden as evidence of compatibility.

## Generic server-error rule
Any operator mutation that produces an unhandled 5xx, generic `This page couldn’t load`, blank state, framework error boundary or equivalent is at least P1 for audit/readiness purposes until root cause, affected data class and regression coverage are established. The project cannot be marked `APTO` while such a reproducible mutation remains unresolved.

## Global propagation
Every active repository maintained by `fredmourao-ai` or `Vivaliz-site` must carry `AUDIT_POLICY.md` (or an explicit pointer to the canonical policy), and its primary agent instruction must require that policy before readiness/completion claims. Existing stricter rules remain in force.

## Solange Rolla re-audit
The first application of this rule is a contradictory re-audit of the Solange Rolla consultório against the exact canonical deployed SHA. It must include persisted data-shape inventory, real-UI state transitions, the Agenda legacy snapshot regression, security/RLS, DB/migrations, exact-SHA runtime parity, backup/restore/rollback evidence, and an explicit evidence-debt ledger.

## Success criteria
The work is complete only when the global policy is persisted in all active repositories, the Solange regression is merged and promoted through the canonical pipeline, the re-audit is executed against the exact deployed SHA, and the final status lists every unvalidated area. No `APTO`/`100%` claim is permitted from green CI alone.
