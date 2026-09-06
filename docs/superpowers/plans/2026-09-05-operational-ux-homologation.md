# Operational UX Homologation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a self-explanatory Solange Rolla-branded operational UI and homologate every critical business flow through the deployed browser on the exact final SHA.

**Architecture:** Keep the existing modular monolith and public module boundaries. Improve shared presentation primitives and module pages without bypassing RLS, audit, idempotency or live-provider feature flags. Browser flows create business data; database access is limited to infrastructure reset/bootstrap and post-action verification.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres/Auth/RLS, Vitest, Playwright, GitHub Actions, Cloudflare Tunnel for temporary homologation exposure, canonical staging/deploy gate.

**Spec:** `docs/superpowers/specs/2026-09-05-operational-ux-homologation.md`

## Global Constraints

- Business data used to homologate critical flows must be created through the application UI.
- Direct SQL/API insertion is not valid functional homologation; it may only bootstrap/reset synthetic infrastructure or verify post-action persistence/audit.
- Preserve `America/Sao_Paulo`, integer cents, RLS, AAL2 clinical protection, audit and idempotency.
- Keep providers live disabled outside production; fiscal homologation remains mock/sandbox.
- Preserve Solange Rolla brand colors and logo while improving responsiveness/accessibility beyond the public Wix reference.
- Zero horizontal overflow at 390 px, usable at 200% zoom, visible focus and minimum 44 px mobile touch targets.
- No task is complete with applicable PRs/checks/deploys pending or useful local changes uncommitted/unmerged.

---

### Task 1: Finish current functional PR queue

**Files:** existing PR #84-#89 files and tests.

**Interfaces:**
- Consumes: existing domain/public module APIs.
- Produces: merged operational flows for birthday, agenda, finance, events, fiscal and reports.

- [ ] Reproduce each currently failing gate on its exact PR head.
- [ ] Add or update a failing regression test before each production-code bugfix.
- [ ] Correct root causes without bypasses.
- [ ] Run lint, typecheck, architecture checks, unit/integration tests, build and applicable E2E.
- [ ] Resolve all substantive review threads.
- [ ] Merge only after exact-head required checks are green.
- [ ] Confirm the associated issue closes and the merged `main` SHA is green.

### Task 2: Shared operational UX primitives

**Files:**
- Modify: shared app shell/navigation/page-header/form/status styles/components identified in the current tree.
- Test: corresponding shared UI Vitest tests and Playwright accessibility/mobile coverage.

**Interfaces:**
- Consumes: existing branded shell and design tokens.
- Produces: consistent page introduction, primary-action hierarchy, human status badge/help/error patterns used by module pages.

- [ ] Write failing component/accessibility tests for page guidance, focus, touch target and status semantics.
- [ ] Run the focused tests and confirm RED.
- [ ] Implement only the shared primitives required by the spec.
- [ ] Run focused tests and confirm GREEN.
- [ ] Run lint, typecheck, architecture checks and build.
- [ ] Commit and open a focused UX PR.

### Task 3: Pessoas and Agenda real-browser flow

**Files:** people and agenda protected pages/actions plus Playwright flows.

**Interfaces:**
- Consumes: people/appointments public APIs and shared UX primitives.
- Produces: browser-created person -> appointment -> edit/reschedule flow.

- [ ] Write Playwright flow that creates a synthetic person through UI, then schedules and reschedules through UI without SQL inserts.
- [ ] Confirm it fails before missing UX/flow fixes.
- [ ] Add clear form grouping, plain-language errors/statuses and next-action feedback.
- [ ] Run the flow until GREEN.
- [ ] Verify persistence/audit after UI actions with read-only DB queries.
- [ ] Validate 390 px and 200% zoom.

### Task 4: Financeiro real-browser flow

**Files:** finance operation pages/actions/tests.

**Interfaces:**
- Consumes: receivables/payables public domain and agenda-created billable data.
- Produces: UI payment, adjustment, refund, payable and recurrence operations with visible balances/status.

- [ ] Replace business-data SQL setup in finance E2E with UI-created prerequisite data.
- [ ] Add failing tests for payment/adjustment/refund/payable state transitions and human-readable feedback.
- [ ] Correct finance status derivation and deterministic UI refresh behavior.
- [ ] Run focused domain + E2E tests to GREEN.
- [ ] Verify audit/idempotency read-only after UI actions.

### Task 5: Eventos real-browser flow

**Files:** events protected pages/actions/tests.

**Interfaces:**
- Consumes: events public module and shared UX primitives.
- Produces: UI event creation, registration, capacity, attendance, payment and expenses.

- [ ] Write a browser-only business-data flow for event creation and registration.
- [ ] Confirm RED where controls/copy/flow are incomplete.
- [ ] Implement clear capacity, financial consequence and attendance feedback.
- [ ] Run E2E to GREEN and verify audit/persistence read-only.

### Task 6: Fiscal mock/sandbox real-browser flow

**Files:** fiscal pages/actions/tests.

**Interfaces:**
- Consumes: fiscal public APIs and mock provider.
- Produces: UI readiness -> request -> progress/artifact -> cancellation flow with live provider disabled.

- [ ] Write browser flow using UI-created eligible source data.
- [ ] Confirm provider/live guards and readiness blockers are understandable.
- [ ] Implement plain-language readiness/error/status presentation where needed.
- [ ] Run E2E to GREEN and verify evidence/audit read-only.

### Task 7: Relatórios and exports real-browser flow

**Files:** reports pages/download routes/tests.

**Interfaces:**
- Consumes: administrative read models only.
- Produces: user-triggered CSV/XLSX/PDF exports with explicit period/filter context.

- [ ] Write browser tests that trigger each export from UI after data was created through prior UI flows.
- [ ] Verify successful download names/types and no clinical payload.
- [ ] Improve labels/errors as necessary and rerun to GREEN.

### Task 8: Browser usability audit across modules

**Files:** shared/module UI tests and evidence docs.

**Interfaces:**
- Consumes: all protected module pages plus public capability journeys.
- Produces: consistent branded, responsive, self-explanatory experience and explicit clinical authorization evidence.

- [ ] Traverse root, login, dashboard, pessoas, agenda, financeiro, eventos, fiscal and relatórios through browser.
- [ ] Traverse `/clinico/[personId]` with `psychologist_owner` + AAL2 and prove secretary/accounting denial without exposing clinical content.
- [ ] Traverse public capability routes for appointment response, form draft/review/signature and signed-form completion using synthetic tokens/data.
- [ ] Validate task description, primary action, human status/error/next action on each page.
- [ ] Validate keyboard focus, 390 px overflow, 200% zoom and minimum touch target requirements on administrative, clinical and patient-facing routes.
- [ ] Fix each failure in a focused branch/PR and repeat the audit.

### Task 9: Auto-gate deploy of exact final SHA

**Files:** canonical staging/deploy workflow and operations docs only if fixes are required.

**Interfaces:**
- Consumes: final green `main` SHA.
- Produces: deployed homologation environment with matching migrations/workers.

- [ ] Confirm zero applicable implementation PRs/issues before candidate selection; the active promotion/evidence tracker (#82) remains open until Task 10 is complete and is explicitly exempt from this preselection check.
- [ ] Record exact candidate SHA.
- [ ] Require CI, Database and Repository Governance Gate to be `completed/success` for that exact SHA and reject any candidate different from current `refs/heads/main`.
- [ ] Let the canonical auto-gate promote exactly that SHA; if deployment fails, inspect logs, fix via PR and restart from a new green SHA.
- [ ] Confirm deployed application `buildSha`, migrations, messaging/document workers and existing Cloudflare/DNS exposure all correspond to the promoted candidate.

### Task 10: Final homologation and operational evidence

**Files:** homologation evidence matrix/runbooks.

**Interfaces:**
- Consumes: deployed exact SHA.
- Produces: reproducible go/no-go evidence.

- [ ] Sign in through the deployed browser and execute every critical flow with synthetic data entered via UI.
- [ ] Confirm post-action DB/audit integrity read-only.
- [ ] Run preflight and authenticated smoke on the deployed SHA.
- [ ] Confirm backup scheduler, latest checksum and isolated restore drill.
- [ ] Confirm no pending/failing relevant Actions, no applicable open PRs/issues and no dirty/uncommitted task worktrees.
- [ ] Update evidence matrix with PASS/FAIL/BLOCKED and exact SHA.
- [ ] Close the final promotion issue only when every technical criterion is PASS or an external production-only gate is explicitly documented.
