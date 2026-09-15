# Audit Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the proven staging provenance blocker by making post-merge validation reliably hand the exact merged SHA to staging only after the canonical gates finish successfully.

**Architecture:** Keep the existing transactional `Staging Promote` workflow unchanged. `PR Auto Merge` re-dispatches CI, Database and Repository Governance Gate for the final squash-merged `main` SHA, polls those exact-SHA runs until all three are green, then explicitly dispatches `Staging Promote` with that SHA. The deploy already builds both workers with immutable `$PROMOTE_SHA` image tags and validates the web `buildSha` before acceptance/finalization.

**Tech Stack:** GitHub Actions, Bash, Node.js, Vitest, Docker.

**Spec:** `docs/quality/AUDIT_STATUS.md`

## Global Constraints
- Do not bypass CI, Database or Repository Governance Gate.
- Do not deploy a SHA different from current `refs/heads/main`.
- Keep live providers disabled in staging.
- Preserve the existing transactional rollback and browser-driven homologation.

### Task 1: Reliable post-merge promotion handoff
**Files:** `.github/workflows/pr-auto-merge.yml`, `tests/integration/environment-workflows.test.ts`
- [x] Add failing contract tests for automatic staging dispatch and exact-SHA gate waiting.
- [x] Run the focused test and observe failure.
- [x] Implement the minimal handoff/polling change.
- [x] Run focused tests green.

### Task 2: Worker release provenance contract
**Files:** `.github/workflows/staging-promote.yml`, `tests/integration/environment-workflows.test.ts`
- [x] Confirm the existing deploy already tags document and messaging workers with `$PROMOTE_SHA`.
- [x] Add a regression assertion that both worker image tags remain tied to the promoted SHA.
- [x] Keep the large transactional deploy workflow otherwise unchanged.

### Task 3: Validation and delivery
**Files:** all changed files
- [x] Run YAML parse, lint, typecheck, focused integration tests and `git diff --check`.
- [x] Review the diff for secrets/destructive behavior.
- [ ] Publish PR, enable auto-merge and verify post-merge promotion on the exact SHA.
- [ ] Verify external health and both running worker images after promotion.
