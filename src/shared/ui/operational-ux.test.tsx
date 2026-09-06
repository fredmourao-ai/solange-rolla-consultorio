import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AppShell } from './app-shell'
import { PageHeader } from './page-header'
import { StatusBadge } from './status-badge'

describe('operational UX primitives', () => {
  it('connects page title, guidance and actions semantically', () => {
    const markup = renderToStaticMarkup(
      <PageHeader title="Agenda" description="Organize as consultas do dia." actions={<button>Agendar consulta</button>} />,
    )

    expect(markup).toContain('aria-labelledby="page-title"')
    expect(markup).toContain('aria-describedby="page-description"')
    expect(markup).toContain('id="page-title"')
    expect(markup).toContain('id="page-description"')
    expect(markup).toContain('role="group"')
    expect(markup).toContain('aria-label="Ações da página"')
  })

  it('announces operational status to assistive technology', () => {
    const markup = renderToStaticMarkup(<StatusBadge status="warning">Aguardando confirmação</StatusBadge>)
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Status: Aguardando confirmação"')
  })

  it('identifies the private product as Solange Rolla consultório management', () => {
    const markup = renderToStaticMarkup(<AppShell>Conteúdo</AppShell>)
    expect(markup).toContain('app-shell__brand-name')
    expect(markup).toContain('Solange Rolla')
    expect(markup).toContain('app-shell__brand-context')
    expect(markup).toContain('Gestão do consultório')
  })

  it('uses the approved brand tokens without weakening accessibility basics', () => {
    const globals = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8').toLowerCase()
    const brand = readFileSync(new URL('../../app/solange-brand.css', import.meta.url), 'utf8').toLowerCase()
    const css = `${globals}\n${brand}`

    expect(css).toContain('--background: #f7f5e1')
    expect(css).toContain('--surface: #fffdf4')
    expect(css).toContain('--foreground: #2f2e2e')
    expect(css).toContain('--primary: #82426e')
    expect(css).toContain('--brand-secondary: #8f4778')
    expect(css).toContain('--accent: #582870')
    expect(css).toContain('min-height: 44px')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).not.toContain('overflow-x: clip')
  })
})
