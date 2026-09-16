# Historical State-Transition Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make historical-data/state-transition coverage a persistent audit gate across active repositories, fix the Agenda legacy-snapshot regression canonically, and re-audit Solange against the exact deployed SHA.

**Architecture:** Keep `docs/quality/EXTREME_AUDIT_PROTOCOL.md` as the canonical detailed protocol and `AUDIT_POLICY.md` as the activation gate. Enforce the rule through agent entrypoints, Definition of Done and repository-governance tests. For Solange, add a domain normalizer for legacy cancellation snapshots, then extend real-UI homologation to mutate representative historical records and verify persistence.

**Tech Stack:** Markdown policy/governance, TypeScript, Vitest, Playwright, Supabase/PostgreSQL, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-16-historical-state-transition-audit-design.md`

## Global Constraints
- UI mutations are mandatory for operator-facing flows; scripts/API/database calls are supporting evidence only.
- Existing historical data classes must be inventoried before a workflow can be marked covered.
- Green CI alone cannot justify `APTO` or `100%`.
- Archived repositories are excluded from active propagation.
- No real patient data may be introduced into tests.

---

### Task 1: Harden the canonical audit policy

**Files:**
- Modify: `docs/quality/EXTREME_AUDIT_PROTOCOL.md`
- Modify: `AUDIT_POLICY.md`
- Modify: `AGENTS.md`
- Modify: `docs/DEFINITION_OF_DONE.md`
- Modify: `docs/TESTING_DEPLOYMENT.md`
- Test: `tests/architecture/repository-governance.test.ts`

**Interfaces:**
- Consumes: existing audit activation and governance rules.
- Produces: a mandatory historical-data/state-transition matrix and UI-first completion gate.

- [ ] **Step 1: Add a failing governance assertion**

Add assertions requiring the canonical protocol to contain `Historical data class`, `no-op update`, `reload/reopen`, and requiring `AGENTS.md` to reference `AUDIT_POLICY.md`.

- [ ] **Step 2: Run the governance test and confirm RED**

Run: `npx vitest run tests/architecture/repository-governance.test.ts`
Expected: FAIL because the required historical-state-transition clauses are absent.

- [ ] **Step 3: Update policy and agent documents**

Add a mandatory section defining the cross-product of operation/state transition × data provenance × UI surface × postcondition. Add DoD checklist items for legacy/migrated persisted data and post-save reload verification.

- [ ] **Step 4: Re-run governance test**

Run: `npx vitest run tests/architecture/repository-governance.test.ts`
Expected: PASS.

### Task 2: Canonically fix Agenda legacy cancellation snapshots

**Files:**
- Modify: `src/modules/appointments/domain/cancellation-policy.ts`
- Modify: `src/modules/appointments/public.ts`
- Modify: `src/app/(protected)/agenda/gerenciar/actions.ts`
- Create: `src/modules/appointments/domain/cancellation-policy-legacy.test.ts`

**Interfaces:**
- Produces: `normalizeCancellationPolicySnapshot(snapshot: unknown): CancellationPolicy`.
- `updateAppointmentAction` must normalize the persisted snapshot before calling `calculateCancellationDeadline`.

- [ ] **Step 1: Add regression test using the historical persisted shape**

```ts
expect(normalizeCancellationPolicySnapshot({
  policyVersion: 1,
  countableHours: 48,
  excludedWeekdays: [6, 0],
})).toEqual({
  policyVersion: 1,
  countableHours: 48,
  excludedWeekdays: [6, 0],
  businessTimezone: 'America/Sao_Paulo',
  lateCancellationChargeEnabled: true,
  noShowChargeEnabled: true,
})
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/modules/appointments/domain/cancellation-policy-legacy.test.ts`
Expected: FAIL because the normalizer does not exist.

- [ ] **Step 3: Implement the normalizer**

Validate `policyVersion`, `countableHours` and `excludedWeekdays`; fill only legacy-missing v1 fields from `DEFAULT_CANCELLATION_POLICY`; reject unsupported/invalid snapshots with `INVALID_CANCELLATION_POLICY`.

- [ ] **Step 4: Use the normalizer in the update action**

Replace the direct cast of `current.cancellation_policy_snapshot` with the exported normalizer.

- [ ] **Step 5: Verify focused tests**

Run: `npx vitest run src/modules/appointments/domain/cancellation-policy-legacy.test.ts src/modules/appointments/domain/cancellation-policy.test.ts`
Expected: PASS.

### Task 3: Add real-UI historical transition coverage

**Files:**
- Modify: `tests/e2e/real-ui-homologation.spec.ts`
- Modify/Create fixture helper under `tests/fixtures/` only if required.

**Interfaces:**
- Consumes: staging synthetic seed plus service-role fixture setup.
- Produces: browser-driven proof that legacy and current Agenda records can be edited and persist after reload.

- [ ] **Step 1: Seed one synthetic legacy-snapshot appointment and one current-format appointment**

Use staging-only synthetic identities and restore original rows in teardown.

- [ ] **Step 2: Add UI test for legacy edit**

Login through the UI, open `/agenda/gerenciar`, edit the legacy appointment, click `Salvar alterações`, wait for the management page, reload, and assert the new date/time remains visible without a framework/server error.

- [ ] **Step 3: Add UI test for no-op update**

Submit an unchanged current-format appointment and assert no 5xx/error boundary plus persisted state unchanged.

- [ ] **Step 4: Run focused Playwright test**

Run the canonical Playwright command for the two new scenarios against staging/local test environment.
Expected: PASS.

### Task 4: Propagate the global rule to active repositories

**Repositories:**
- `fredmourao-ai/solange-rolla-consultorio`
- `fredmourao-ai/mei-mg-email`
- `Vivaliz-site/site-shopvivaliz`
- `Vivaliz-site/amazon-returns-safet`
- `Vivaliz-site/ml-pricing-api`
- `Vivaliz-site/shopvivaliz-m365`
- `Vivaliz-site/-shopvivaliz-pipeline`
- `Vivaliz-site/mercadolivre-returns-recovery`

**Files per repository:**
- Create/update `AUDIT_POLICY.md`.
- Update the primary agent instruction (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or equivalent) to require the policy before readiness/completion claims.

- [ ] **Step 1: Inspect each repository’s existing policy/agent files**
- [ ] **Step 2: Create one focused branch per repository**
- [ ] **Step 3: Add the same minimum global rule without overwriting stricter local rules**
- [ ] **Step 4: Run each repository’s smallest governance/lint/docs validation available**
- [ ] **Step 5: Open PRs and merge only after required checks are green**

### Task 5: Full Solange validation and canonical promotion

**Files/Systems:** GitHub Actions, staging host, Supabase staging, backup/restore runbooks.

- [ ] **Step 1: Run lint, typecheck, architecture/module checks, focused tests, full unit/integration suite and build**
- [ ] **Step 2: Run DB reset/migrations/pgTAP and synthetic seed checks**
- [ ] **Step 3: Run full Playwright E2E including historical transition scenarios**
- [ ] **Step 4: Merge the Solange PR only with canonical gates green**
- [ ] **Step 5: Confirm staging promotion deploys the exact merged SHA**
- [ ] **Step 6: Confirm `/api/health.buildSha` and worker versions match that SHA**

### Task 6: Contradictory re-audit with real data-shape inventory

**Files:**
- Modify: `docs/quality/AUDIT_STATUS.md`
- Create: `docs/quality/2026-09-16-state-transition-matrix.md`

**Interfaces:**
- Produces: explicit evidence ledger for every material workflow/data class combination.

- [ ] **Step 1: Inventory staging data by entity, state, version/null shape and historical snapshot shape**
- [ ] **Step 2: Execute UI create/read/update/no-op/state transitions for each material category**
- [ ] **Step 3: Verify persisted rows, audit/history, dependent state and reload/reopen after every mutation**
- [ ] **Step 4: Re-run security/RLS, backup/restore, rollback and release-provenance gates**
- [ ] **Step 5: Record every untested/destructive category as `NÃO VALIDADO`**
- [ ] **Step 6: Update `AUDIT_STATUS.md` with the exact deployed SHA, findings, evidence debt and final readiness status**

## Self-review
- Spec coverage: all requirements map to Tasks 1–6.
- No placeholder implementation steps are used for code behavior; domain normalizer and regression expectations are explicit.
- Cross-repository propagation is isolated from the Solange code fix so stricter repository-specific policies remain intact.
- Completion requires exact-SHA staging evidence and contradictory re-audit, not merely merged documentation.