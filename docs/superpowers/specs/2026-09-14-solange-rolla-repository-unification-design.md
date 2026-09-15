# Solange Rolla Repository Unification Design

## Status
Approved architectural direction; implementation pending final spec review.

## Context
Two GitHub repositories currently represent the same product lineage:

- `fredmourao-ai/solange-rolla`: early local MVP, implemented as static HTML/CSS/JS with `localStorage`, no backend, authentication, multi-user support, or real external integrations.
- `fredmourao-ai/solange-rolla-consultorio`: current production-oriented system, implemented with Next.js/TypeScript and Supabase/PostgreSQL, with modular architecture, RLS, MFA, queues/workers, financial/fiscal/clinical boundaries, CI, E2E, runbooks, release gates, and operational documentation.

Treating these as independent projects causes duplicated audits, duplicated readiness reporting, ambiguous ownership, and risk of agents continuing work in the obsolete prototype.

## Decision
`fredmourao-ai/solange-rolla-consultorio` becomes the single canonical repository for the **Solange Rolla** project.

`fredmourao-ai/solange-rolla` becomes a read-only historical/legacy repository after useful knowledge is reconciled into the canonical repository.

All future code, issues, audits, releases, planning, operations, and project-status reporting belong to `solange-rolla-consultorio`.

## Why the consultório repository is canonical
The old repository explicitly describes itself as a local MVP and records critical limitations: no backend, no authentication, no real fiscal/payment integration, browser-only sensitive data, and no multi-user support. The current repository implements the architecture that the MVP itself recommended: relational backend, authentication, security boundaries, durable integrations, automated tests, deployment controls, and operational runbooks.

Therefore, repository unification is not a source-code merge between equal implementations. It is a **lineage consolidation** in which the prototype is superseded by the current system.

## Approaches considered

### A. Merge both Git histories into one working tree
Rejected. It would introduce unrelated prototype files (`index.html`, `styles.css`, `app.js`) into the modern application, create confusing parallel entry points, and provide no operational value.

### B. Keep both repositories active and cross-link them
Rejected. This preserves exactly the ambiguity that caused duplicate audits and project-status classification.

### C. Canonical repository + historical legacy repository
Selected. The current system remains clean and authoritative. Useful prototype knowledge is reconciled into the canonical documentation, while the original repository remains available for provenance but is explicitly frozen/archived.

## Scope of migration

### Migrate conceptually, not mechanically
Review the legacy repository for requirements, invariants, operational concepts, or historical decisions that are not already represented in the canonical project.

The legacy architecture contains these broad concepts that must be checked against the canonical system:
- unified person/client record;
- appointment lifecycle and confirmation/rebooking/cancellation;
- emergency contact;
- financial receivables/payments and reconciliation with appointment/event;
- event calendar/participants;
- fiscal profile and invoice lifecycle;
- independence of agenda from fiscal availability;
- audit trail for relevant changes;
- role-based protection of sensitive data;
- backup/restore expectation;
- operational dashboard oriented to daily work.

If an item already exists in canonical documentation or implementation, do not duplicate it. If a durable requirement exists only in the legacy repository, incorporate it into the appropriate canonical source of truth (architecture, product flows, data model, security/privacy, integration docs, ADR, or project history).

### Do not migrate
- `localStorage` as a persistence strategy;
- prototype-only implementation code solely for historical preservation;
- browser state or local data;
- any secrets, credentials, cached data, or real personal data;
- obsolete technical stack recommendations that conflict with current ADRs/architecture;
- duplicate audit status claiming the prototype and canonical system are separate products.

## Historical lineage record
Create a canonical lineage document under `docs/legacy/` that records:
- the old repository URL/name;
- its role as the first local MVP/prototype;
- the date/context of supersession;
- which concepts carried forward;
- which implementation approaches were intentionally retired;
- the canonical repository path and policy that all new work occurs there.

The goal is traceability, not carrying dead code into the active product.

## Audit consolidation
There must be exactly one readiness/audit status for the Solange Rolla project.

- The audit request opened in `fredmourao-ai/solange-rolla` must be closed as duplicate/superseded, with a pointer to the canonical audit flow.
- The canonical readiness assessment must occur in `fredmourao-ai/solange-rolla-consultorio` and must include any remaining relevant legacy invariants.
- Current known NO-GO/P0/homologation blockers in the canonical repository remain authoritative; unification must not hide or downgrade them.
- `docs/quality/AUDIT_STATUS.md` in the canonical repository remains the only certification ledger for the project.

## Legacy repository end state
After canonical migration and verification, `fredmourao-ai/solange-rolla` must:
- have a top-level README banner stating that the repository is historical and superseded;
- point users/agents to `fredmourao-ai/solange-rolla-consultorio`;
- prohibit new functional development there;
- close its duplicate readiness audit as superseded;
- be archived in GitHub if the available connector/API permissions allow it safely; if archive mutation is unavailable, leave the repository clearly frozen and document that archive is the only remaining administrative action.

Do not delete the legacy repository. Its Git history remains useful provenance.

## Canonical repository changes
The canonical repository should receive:
1. `docs/legacy/solange-rolla-mvp-lineage.md` documenting provenance and reconciled concepts.
2. A short note in `README.md` stating that this repository is the canonical Solange Rolla project and supersedes the former local MVP repository.
3. A note in the audit overlay that historical prototype evidence is provenance only and cannot be used as current production evidence.
4. Any genuinely missing durable requirement discovered during legacy-vs-canonical comparison, placed in the proper existing authoritative document instead of duplicated in the lineage file.

## Issue and task governance
Issue `#147` in the canonical repository owns the unification.

No new implementation tasks should be created in the legacy repository. Existing legacy issues that refer to ongoing product work should either be:
- closed as superseded/duplicate when already represented canonically; or
- recreated/migrated to the canonical repository if they contain still-valid unfinished work not represented there.

Links should preserve traceability between old and new issue numbers.

## Validation
Before declaring unification complete:
- compare the legacy README, `AUDITORIA_SOLANGE.md`, and `ARQUITETURA_SOLANGE.md` against canonical architecture/product/data/security docs;
- prove no unique durable requirement was silently lost;
- confirm the canonical repository contains the lineage record;
- confirm the legacy README clearly redirects to the canonical repository;
- confirm duplicate audit issue is closed as superseded;
- confirm canonical CI/gates for documentation/governance changes are green;
- confirm project-status reporting treats both former repository names as one project;
- verify the canonical audit remains `NO-GO`/not certified wherever existing blockers require it.

## Rollback
The change is documentation/governance-oriented and non-destructive. Git history is preserved in both repositories. If a migrated requirement is found to be incorrect, revert the documentation PR in the canonical repository. Do not unarchive/reactivate the legacy repository for ordinary feature work; instead correct the canonical sources of truth.

## Success criteria
Unification is complete when:
1. `solange-rolla-consultorio` is the only active/canonical Solange Rolla development repository.
2. `solange-rolla` is visibly historical/frozen (and archived when administratively possible).
3. One audit/readiness ledger exists for Solange Rolla.
4. No useful domain requirement from the prototype is lost.
5. No obsolete prototype implementation is injected into the modern app.
6. Agents and future reports can no longer classify the two repositories as separate projects.
