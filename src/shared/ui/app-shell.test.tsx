import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))

import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('uses the branded private-workspace shell', () => {
    const html = renderToStaticMarkup(<AppShell><p>Conteúdo</p></AppShell>)
    expect(html).toContain('solange-rolla-logo.png')
    expect(html).toContain('Gestão do consultório')
    expect(html).toContain('Ambiente privado e rastreável')
  })
})
