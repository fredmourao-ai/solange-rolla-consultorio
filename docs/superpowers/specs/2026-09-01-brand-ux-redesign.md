# Solange Rolla Brand UX Redesign

## Goal
Turn the private consultorio application into a polished operational product that clearly belongs to the Solange Rolla brand while remaining more responsive, accessible and usable than the public Wix reference.

## Reference evidence
- Visual source of truth: `https://www.solangerolla.com.br/`.
- Dominant brand colors observed in computed styles: `#82426E`, `#8F4778`, `#582870`, `#F7F5E1`, `#FFFDF4`, `#2F2E2E`.
- Reference typography includes Poppins, Raleway and Open Sans families.
- Public logo asset is the Solange Rolla calligraphic wordmark with the purple star mark.
- The Wix reference is not a responsive implementation target: at a 390px device viewport its document width is about 1017px.

## Product direction
The application should feel calm, premium, human and organized rather than generic SaaS. Use the public brand as visual inspiration, not as a layout template.

The operational UI must retain dense information clarity: readable dates, money, statuses and actions come before decoration. Photography from the marketing site is not required inside the private shell.

The logo may be reused as a brand asset because the user explicitly requested alignment with the client's public identity. No testimonial, patient or clinical imagery is to be imported.
## Experience requirements
- Root entry and login must communicate the Solange Rolla identity immediately.
- Protected shell must use the same brand system across dashboard, people, agenda, events, finance, fiscal and reports.
- Mobile must have zero horizontal page overflow at 390px and remain usable at 200% zoom.
- Primary actions use plum; secondary emphasis uses deep purple; semantic success/warning/danger keep distinct meanings.
- Cards use warm white surfaces, restrained shadows, rounded corners and clear hierarchy.
- Sidebar desktop navigation should feel branded and calm, not like a default admin template.
- Mobile navigation must keep a minimum 44px target and visible keyboard focus.
- No external font dependency is required; use robust system fallbacks that approximate the public typography.
- Respect `prefers-reduced-motion` and preserve WCAG contrast/focus behavior.

## Public availability
`trycloudflare.com` is a temporary preview path, not a production deployment strategy. A transient iOS server error was observed even while server-side curls returned HTTP 200. The stable target remains a real deployment path (Vercel per project architecture) with post-deploy smoke checks.

## Validation
Before merge: lint, typecheck, unit, build, architecture checks, E2E, axe accessibility, mobile viewport/zoom, and visual screenshots for root plus representative protected routes. Final smoke must confirm a stable public URL and no 5xx.
