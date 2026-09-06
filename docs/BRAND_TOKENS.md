# Brand Tokens

The private operational interface is intentionally aligned with the public Solange Rolla identity while keeping accessibility and information clarity as product constraints.

## Reference identity
- Visual reference: `https://www.solangerolla.com.br/`.
- Product name: Solange Rolla Consultorio.
- Language: Brazilian Portuguese (`pt-BR`).
- Audience: internal staff; keyboard, touch and 200% zoom remain first-class requirements.
- Public logo: reused locally as `public/brand/solange-rolla-logo.png`.
- Marketing testimonials, patient imagery and clinical content are not imported into the private product.

## Semantic palette
`src/app/globals.css` contains the base semantic design-system tokens. `src/app/solange-brand.css`, imported after it by the root layout, is the canonical Solange Rolla brand layer and intentionally overrides only the approved brand-specific tokens below. Components consume semantic variables rather than physical colors.

| Token | Solange value | Use |
| --- | --- | --- |
| `--background` | `#f7f5e1` | warm page background |
| `--surface` | `#fffdf4` | panels and cards |
| `--brand-secondary` | `#8f4778` | secondary brand emphasis |
| `--foreground` | `#2f2e2e` | primary text |
| `--primary` | `#82426e` | primary actions and brand emphasis |
| `--accent` | `#582870` | headings, links and secondary emphasis |
| `--border` | `#e2d5dc` | separators and field boundaries |
| `--focus-ring` | `#6c3f94` | keyboard focus |

The brand layer must not redefine interaction/accessibility primitives. Responsive wrapping, focus, touch-target and reduced-motion rules remain explicit and testable.
