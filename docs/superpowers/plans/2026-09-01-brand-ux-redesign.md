# Solange Rolla Brand UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the application's visual system around the Solange Rolla identity, harden mobile UX, and replace the fragile preview path with a validated stable deployment workflow.

**Architecture:** Keep the existing Next.js modular monolith and component contracts. Centralize visual identity in semantic CSS tokens and shared shell components; page modules continue consuming existing `Card`, `PageHeader`, navigation and form primitives. Deployment remains isolated from production data and follows repository environment gates.

**Tech Stack:** Next.js 16.2.11, React 19.2.8, TypeScript 5.9.2, CSS, Vitest, Playwright, Supabase, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-01-brand-ux-redesign.md`

## Global Constraints
- Visual source of truth is `https://www.solangerolla.com.br/`.
- Do not import testimonial, patient or clinical imagery from the public site.
- Keep protected business logic and module boundaries unchanged.
- Mobile page width must not exceed viewport width at 390px.
- Touch targets stay at least 44px and focus remains visible.
- No production data or production provider flag is used in tests.
- Every code change follows test-first regression coverage where applicable.
- Validate lint, typecheck, unit, architecture, build and E2E before merge.

---
### Task 1: Brand contract and regression tests

**Files:**
- Modify: `tests/e2e/style-baseline.spec.ts`
- Modify: `tests/e2e/mobile-elderly-ux.spec.ts`
- Modify: `docs/BRAND_TOKENS.md`

- [ ] Add failing E2E assertions for brand logo/identity, semantic plum tokens, root no-overflow at 390px, protected shell no-overflow and accessible mobile navigation.
- [ ] Run targeted tests against the current UI and capture the expected failures.
- [ ] Update brand documentation only after the regression expectations are fixed.

### Task 2: Shared visual system and shell

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/shared/ui/app-shell.tsx`
- Modify: `src/shared/ui/mobile-nav.tsx`
- Modify: `src/shared/ui/sidebar-nav.tsx`
- Modify: shared primitive styles only as needed.

- [ ] Implement semantic brand tokens and typography hierarchy.
- [ ] Redesign desktop sidebar, active navigation, cards, page headers, forms and status surfaces.
- [ ] Redesign mobile header/menu without changing route or authorization behavior.
- [ ] Re-run targeted tests until green.
### Task 3: Branded entry and authentication surfaces

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx` or its existing login UI component
- Add: local brand asset under `public/brand/` if reused from the client's public site.

- [ ] Add a failing test that distinguishes the new branded entry from the generic SaaS hero.
- [ ] Implement a restrained branded entry with logo, warm surfaces and direct internal-access CTA.
- [ ] Bring login into the same visual system without exposing operational data.
- [ ] Verify root and login at desktop and 390px mobile.

### Task 4: Cross-route responsive and accessibility audit

**Files:**
- Modify: CSS/components only where a reproduced issue requires it.
- Modify: relevant `tests/e2e/*.spec.ts` with regression coverage.

- [ ] Exercise dashboard, agenda, people, finance, events, fiscal and reports on desktop and 390px.
- [ ] Run axe checks and 200% zoom checks.
- [ ] Add a failing regression before every bug fix found in this audit.
- [ ] Capture representative screenshots and confirm no horizontal page overflow.

### Task 5: Full verification, review, PR and deployment smoke

- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run arch:check`, `npm run modules:check`, `npm run build`, dependency audit and E2E.
- [ ] Perform an independent whole-branch review; resolve Important/Critical findings.
- [ ] Commit only after local validation, push feature branch, create PR and wait for required CI including isolated Supabase E2E.
- [ ] Merge only with green checks and no unresolved critical review findings.
- [ ] Validate the deployed stable URL from an external path and mobile viewport; confirm no 5xx, no overflow and correct branded entry.
- [ ] Verify final `git status` is clean and no relevant local changes remain.
