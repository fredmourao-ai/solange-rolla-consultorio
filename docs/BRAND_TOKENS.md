# Brand Tokens

These are the initial product tokens for the private operational interface.
They are semantic and intentionally independent from any public website asset.
No patient names, testimonials or clinical imagery are used as design data.

## Confirmed identity

- Product name: Solange Rolla Consultorio.
- Language: Brazilian Portuguese (`pt-BR`).
- Audience: internal staff, with emphasis on readable controls and keyboard use.
- Public logo and photography: not imported in this foundation; an approved
  asset can be added later without changing component contracts.

## Semantic palette

The physical values live in `src/app/globals.css`. Components consume these
semantic variables instead of hard-coded colors.

| Token | Use |
| --- | --- |
| `--background` / `--surface` | page and panel backgrounds |
| `--foreground` / `--muted` | primary and supporting text |
| `--primary` / `--primary-foreground` | main actions and active navigation |
| `--accent` | secondary emphasis and links |
| `--border` | separators and field boundaries |
| `--danger` / `--success` / `--warning` | status meaning, always paired with text |
| `--focus-ring` | keyboard focus indicator |

Touch targets use a minimum 44px height. Focus remains visible at 200% zoom;
color is never the sole status signal.
