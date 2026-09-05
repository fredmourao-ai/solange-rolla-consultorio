# Operational UX Homologation Design

## Goal
Make the private Solange Rolla application self-explanatory, easy to learn and operate, visually coherent with the client's public site, and homologable through real browser interaction rather than direct database setup.

## Visual direction
- Preserve the existing Solange Rolla brand system: plum `#82426E`, rose-plum `#8F4778`, deep purple `#582870`, warm cream `#F7F5E1`, warm white `#FFFDF4`, charcoal `#2F2E2E`.
- Reuse the Solange Rolla wordmark/logo already approved for the private application.
- The protected product should feel calm, premium, human and organized, not like a generic admin template.
- Use the public website as visual inspiration, not as a layout template; the private application must be more responsive and operationally clear than the Wix reference.

## Interaction principles
- Every page states what the user can do there in plain Portuguese.
- Primary buttons use concrete verbs such as `Agendar consulta`, `Registrar pagamento`, `Reagendar`, `Emitir NFS-e`, `Criar evento` and `Baixar relatório`.
- Internal terms such as idempotency key, repository, migration, provider payload or database status must never be required knowledge for routine operation.
- Forms are grouped by task, use safe defaults, concise labels and short contextual help only where it prevents mistakes.
- Success, warning, failure and pending states are visually distinct and expressed in human language.
- After every mutation, the UI makes the resulting state and next available action obvious.
- Rare/destructive actions are secondary and require explicit confirmation when irreversible.

## Navigation and information hierarchy
- Desktop: branded sidebar with clear module names and one obvious active state.
- Mobile: compact navigation with minimum 44 px touch targets and no horizontal page overflow at 390 px.
- Dashboard: prioritize `o que precisa da minha atenção hoje`, with direct links to pending confirmations, overdue receivables, fiscal failures, upcoming payables and other operational exceptions.
- List pages remain scannable; detailed history and secondary actions belong in detail cards/pages instead of crowding the list.

## Module requirements
### Pessoas
- Create/search/edit people from UI with understandable duplicate guidance.
- Clearly separate administrative data from clinical content.

### Agenda
- Create, edit and reschedule appointments from UI.
- Person, service, date/time, status and cancellation deadline must be understandable without technical documentation.
- Conflict and policy errors must explain what needs to change.

### Financeiro
- Payments, adjustments/waivers, refunds, payables and recurrence actions use plain-language labels and visible resulting balances.
- Never require the user to understand internal receivable/payment state names.

### Eventos
- Event creation, registration, capacity, attendance, payment and expenses are operated through UI.
- Capacity and financial consequences are visible before confirming relevant actions.

### Fiscal
- Homologation exposes mock/sandbox only until live fiscal prerequisites are approved.
- Readiness blockers are shown as actionable human-language items.
- Request, progress, artifact availability and cancellation are visible from the UI.

### Relatórios
- CSV, XLSX and PDF exports are accessible through obvious controls with period/filter context.
- Export status/errors use user-facing language and never expose clinical content.

## Error handling
- User-facing errors describe the failed action, likely cause when safe, and what the user can do next.
- Technical codes remain in structured logs/audit evidence, not as the primary interface copy.
- A failed action must not leave a misleading success state.

## Accessibility and responsive acceptance
- Zero horizontal page overflow at 390 px.
- Usable at 200% zoom.
- Minimum 44 px touch targets for primary interactive controls on mobile.
- Visible keyboard focus, semantic labels and WCAG-compatible contrast.
- Respect `prefers-reduced-motion`.

## Real-browser homologation rule
Business data for homologation scenarios must be created through the application UI using browser interactions. Direct SQL/API inserts may be used only for infrastructure/bootstrap, cleanup/reset of synthetic environments, or post-action verification of persistence/audit integrity. A scenario whose appointment, person, payment, payable, event, fiscal request or other business entity was fabricated directly in the database does not count as functional homologation.

## Homologation acceptance
A routine operator must be able to sign in and complete the critical flows without consulting database structure, code, module names or developer documentation. Each critical flow must be exercised through the deployed browser UI on the exact candidate SHA. Backend queries may confirm persistence, authorization, audit and idempotency after the UI action.

## Release gate
The application is not homologated until all applicable PRs/issues are closed, required Actions are green, the exact final `main` SHA is deployed by the canonical auto-gate, migrations/workers match that SHA, browser-based end-to-end scenarios pass, and backup/restore plus preflight/smoke evidence are recorded.
