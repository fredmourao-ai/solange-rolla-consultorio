# Brand Tokens

The private operational interface is now intentionally aligned with the public Solange Rolla identity while keeping accessibility and information clarity as product constraints.

## Reference identity
- Visual reference: `https://www.solangerolla.com.br/`.
- Product name: Solange Rolla Consultorio.
- Language: Brazilian Portuguese (`pt-BR`).
- Audience: internal staff; keyboard, touch and 200% zoom remain first-class requirements.
- Public logo: reused locally as `public/brand/solange-rolla-logo.png`.
- Marketing testimonials, patient imagery and clinical content are not imported into the private product.

## Semantic palette
The physical values live in `src/app/globals.css`; components consume semantic variables.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#f8f3ef` | warm page background |
| `--surface` | `#fffdf8` | panels and cards |
| `--surface-muted` | `#f3e9ee` | subtle brand-tinted emphasis |
| `--foreground` | `#2f2e2e` | primary text |
| `--primary` | `#82426e` | primary actions and brand emphasis |
| `--accent` | `#582870` | headings, links and secondary emphasis |
| `--border` | `#e2d5dc` | separators and field boundaries |
| `--focus-ring` | `#6c3f94` | keyboard focus |
