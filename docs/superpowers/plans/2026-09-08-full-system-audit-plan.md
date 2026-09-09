# Full System Audit and Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit and correct the Solange Rolla application end-to-end, with reproducible evidence for security, business rules, database/RLS, integrations, UI, deployment and recovery.

**Architecture:** Preserve the existing modular monolith and fail-closed security model. Every confirmed defect receives a regression test before the smallest corrective change. Changes stay isolated in this worktree and are merged only after canonical gates pass.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/PostgreSQL, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/ARCHITECTURE.md`, `docs/SECURITY_PRIVACY.md`, `AGENTS.md`, `docs/DEFINITION_OF_DONE.md`.

## Global Constraints

- Never use real patient data in development or tests.
- Clinical content remains exclusive to `psychologist_owner` at AAL2.
- Money remains integer cents; agenda, financial and fiscal states remain independent.
- Applied migrations are immutable; corrections require forward-only migrations.
- External live providers remain disabled outside production.
- No secrets may be printed, committed or included in reports.
- All fixes require regression evidence and full applicable validation.

---

### Task 1: Baseline, supply chain and static security audit
- [ ] Verify clean worktree and locked dependencies.
- [ ] Run typecheck, lint, unit tests, architecture checks, build and dependency audit.
- [ ] Scan source, workflows and migrations for secrets, dangerous APIs, unsafe logging, broad service-role use and missing request limits.
- [ ] Correct every confirmed defect with tests and rerun the affected gates.

### Task 2: Authentication, authorization, MFA and capability links
- [ ] Audit protected routing, role checks, AAL2 enforcement, cookie/session handling, capability exchange, expiry and revocation.
- [ ] Exercise negative tests for anonymous, secretary and accounting access to clinical resources.
- [ ] Verify CSRF/origin protection, rate limiting and token redaction on public actions.
- [ ] Fix confirmed bypasses or fail-open paths by TDD.

### Task 3: Database integrity and RLS
- [ ] Rebuild a clean local Supabase database from migrations and synthetic seed.
- [ ] Run pgTAP/RLS authorization matrix and generated-type drift checks.
- [ ] Audit exposed tables for RLS, default-deny policies, constraints, foreign keys, immutability and indexes.
- [ ] Add forward-only corrective migrations and database regression tests for confirmed defects.

### Task 4: Critical business rules and concurrency
- [ ] Audit appointment cancellation deadlines/timezone/history, state-machine transitions and recurrence.
- [ ] Audit receivables/payables for integer money, idempotency, refunds/exemptions and non-destructive history.
- [ ] Audit forms/signatures for immutable signed versions, canonical hashing and replay protection.
- [ ] Audit queues/workers for leases, retries, deduplication and terminal failure visibility.

### Task 5: APIs, webhooks and external integrations
- [ ] Audit every route handler and webhook for schema validation, size limits, authentication/signatures, deduplication and safe errors.
- [ ] Verify WhatsApp/email/NFS-e live flags fail closed outside production.
- [ ] Exercise contract tests for mock/sandbox providers and repeated delivery.
- [ ] Fix confirmed defects with tests before implementation.

### Task 6: UI resilience, accessibility and end-to-end flows
- [ ] Start isolated local Supabase and application with synthetic data only.
- [ ] Run Playwright smoke/E2E for login, people, appointment, public form/signature, finance, fiscal, event and reports flows.
- [ ] Run negative clinical-access cases plus axe accessibility and mobile/zoom checks.
- [ ] Fix crashes, broken states, unsafe error exposure and inaccessible critical interactions with regression tests.

### Task 7: Observability, privacy, backup and recovery
- [ ] Audit health, logs, correlation IDs, redaction and audit-event coverage for critical actions.
- [ ] Verify no clinical/CPF/token/secret data reaches technical logs or reports.
- [ ] Execute documented backup/restore verification in an isolated environment where tooling permits.
- [ ] Correct executable runbook or code defects and record external-only legal/provider gates separately.

### Task 8: CI/CD, governance and final integration
- [ ] Reproduce canonical CI and database workflows on the audited commit.
- [ ] Verify repository governance, branch/PR debt, Actions and staging/production fail-closed gates.
- [ ] Run final full suite, build, database tests and E2E after all corrections.
- [ ] Push branch, open focused PR, resolve failures, merge only green, then verify the merged SHA and post-merge checks.

## Completion rule

The audit is complete only when every executable item above has passing evidence or a specific external blocker is documented with the exact action required to resume. A green unit suite alone is not completion.
