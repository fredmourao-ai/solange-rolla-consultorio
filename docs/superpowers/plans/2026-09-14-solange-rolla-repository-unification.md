# Solange Rolla Repository Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `fredmourao-ai/solange-rolla` and `fredmourao-ai/solange-rolla-consultorio` into one logical Solange Rolla project with `solange-rolla-consultorio` as the only active/canonical repository.

**Architecture:** Preserve the modern Next.js/Supabase repository unchanged as the application source of truth and migrate only historical requirements/provenance from the legacy static MVP. Freeze the legacy repository by redirecting its README and closing its duplicate readiness audit; keep Git history intact and archive it only if repository-administration tooling supports that safely.

**Tech Stack:** GitHub repositories/issues/PRs, Markdown governance/docs, existing GitHub Actions/CI.

**Spec:** `docs/superpowers/specs/2026-09-14-solange-rolla-repository-unification-design.md`

## Global Constraints

- `fredmourao-ai/solange-rolla-consultorio` is the sole canonical repository.
- Do not merge legacy `index.html`, `styles.css`, `app.js`, `localStorage` persistence, browser data, credentials or secrets into the modern application.
- Preserve both Git histories; do not delete the legacy repository.
- Existing canonical NO-GO/P0/homologation blockers remain authoritative and must not be downgraded by unification.
- Future audit/readiness status for Solange Rolla exists only in canonical `docs/quality/AUDIT_STATUS.md`.
- Legacy evidence is provenance only and cannot prove current production behavior.

---

### Task 1: Reconcile Legacy Requirements and Record Lineage

**Files:**
- Create: `docs/legacy/solange-rolla-mvp-lineage.md`
- Read: legacy `README.md`, `AUDITORIA_SOLANGE.md`, `ARQUITETURA_SOLANGE.md`
- Read: canonical `docs/PRODUCT_FLOWS.md`, `docs/DATA_MODEL.md`, `docs/SECURITY_PRIVACY.md`, `README.md`

**Interfaces:**
- Consumes: approved repository-unification spec and both repositories' documentation.
- Produces: a durable mapping from every legacy domain concept to its canonical equivalent or explicit retired/pending status.

- [ ] **Step 1: Build the reconciliation matrix**

Record at minimum: unified person/client, emergency contact, appointment lifecycle, finance/reconciliation, events, fiscal, agenda independence, audit trail, role-based privacy, backup/restore and daily operations dashboard.

- [ ] **Step 2: Mark each legacy concept as `CARRIED_FORWARD`, `SUPERSEDED`, `RETIRED`, or `NEEDS_PRODUCT_DECISION`**

No legacy concept may disappear without an explicit status and rationale.

- [ ] **Step 3: Create the lineage document**

The document must state that the static MVP was the historical prototype and that all current work belongs to `solange-rolla-consultorio`.

- [ ] **Step 4: Validate the mapping**

Run a documentation review that confirms each legacy heading from `ARQUITETURA_SOLANGE.md` and each critical/high finding from `AUDITORIA_SOLANGE.md` has a mapping or explicit retirement rationale.

- [ ] **Step 5: Commit**

Commit message: `docs: record Solange Rolla MVP lineage`

### Task 2: Make Canonical Ownership Explicit

**Files:**
- Modify: `README.md`
- Modify: `docs/quality/AUDIT_OVERLAY.md`
- Modify: `docs/superpowers/specs/2026-09-14-solange-rolla-repository-unification-design.md`

**Interfaces:**
- Consumes: lineage document from Task 1.
- Produces: unambiguous canonical-project and audit provenance rules.

- [ ] **Step 1: Add canonical-repository note to README**

State that this repository is the sole active Solange Rolla source of code, issues, audits, releases and operations, and that `fredmourao-ai/solange-rolla` is a superseded prototype.

- [ ] **Step 2: Add legacy-evidence rule to audit overlay**

Explicitly state that legacy MVP screenshots/tests/audits cannot count as evidence for the current application or production readiness.

- [ ] **Step 3: Mark the design spec as approved/implemented-in-progress**

Remove wording that says final spec review is pending.

- [ ] **Step 4: Validate references**

Verify README, audit overlay and lineage all point to the same canonical repository name and do not describe the two repos as separate projects.

- [ ] **Step 5: Commit**

Commit message: `docs: establish canonical Solange Rolla repository`

### Task 3: Consolidate Audit and Issue Governance

**Files/Issues:**
- Close legacy `fredmourao-ai/solange-rolla#9` as duplicate/superseded.
- Keep canonical `docs/quality/AUDIT_STATUS.md` as the only readiness ledger.
- Create/maintain canonical issue ownership under `fredmourao-ai/solange-rolla-consultorio#147`.

**Interfaces:**
- Consumes: canonical ownership decision and current open P0/NO-GO blockers.
- Produces: one logical readiness status for Solange Rolla.

- [ ] **Step 1: Close legacy readiness audit issue**

Use state reason `duplicate` or `not_planned` with a body/update that points to the canonical repository and explains the project has been unified.

- [ ] **Step 2: Record canonical audit rule in #147**

State that the project remains not certified until the canonical audit ledger is updated after P0/NO-GO blockers are cleared and the full gate is run.

- [ ] **Step 3: Verify no second open `AUDITORIA EXTREMA — certificação de prontidão do projeto` remains in the legacy repository**

Search issues and confirm zero duplicate active certification requests.

### Task 4: Freeze the Legacy Repository

**Files:**
- Modify in `fredmourao-ai/solange-rolla`: `README.md`

**Interfaces:**
- Consumes: canonical lineage and repository decision.
- Produces: an unmistakable historical-only entry point.

- [ ] **Step 1: Replace legacy README with historical banner**

The README must identify the repo as a superseded local MVP, point to `fredmourao-ai/solange-rolla-consultorio`, prohibit new functional work, and preserve pointers to historical files.

- [ ] **Step 2: Preserve historical artifacts**

Do not delete `AUDITORIA_SOLANGE.md`, `ARQUITETURA_SOLANGE.md`, `index.html`, `styles.css`, `app.js` or Git history.

- [ ] **Step 3: Validate freeze semantics**

Confirm the legacy README contains `LEGADO`, `NÃO USAR PARA NOVO DESENVOLVIMENTO`, and the canonical repo name.

- [ ] **Step 4: Commit through PR**

Commit message: `docs: freeze superseded Solange Rolla MVP`

### Task 5: Validate, Merge, and Archive if Supported

**Files/PRs:**
- Canonical branch: `chore/unify-solange-rolla-repositories`
- Legacy branch: `chore/mark-legacy-after-unification`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: merged canonical governance and frozen legacy repository.

- [ ] **Step 1: Open focused PRs in both repositories**

Canonical PR references #147 and includes spec, plan, lineage, README and audit-overlay updates. Legacy PR contains only the freeze/redirect README change.

- [ ] **Step 2: Run all required GitHub checks**

Do not bypass CI, branch protection, review requirements or governance gates.

- [ ] **Step 3: Merge only when green**

Use squash merge if that is the repository policy.

- [ ] **Step 4: Verify post-merge `main`**

Confirm canonical docs are present on `main`, legacy README redirects correctly, and the duplicate legacy audit issue is closed.

- [ ] **Step 5: Archive legacy repository if supported**

If the connected GitHub tooling exposes a safe repository-archive mutation, archive `fredmourao-ai/solange-rolla`. If not, leave it visibly frozen and record `ARCHIVE ADMIN ACTION PENDING` as the only administrative residual action.

- [ ] **Step 6: Close #147 only after verification**

Document evidence: merged PRs, canonical lineage path, duplicate audit closure, archive/freeze state, and any residual admin-only archive action.
