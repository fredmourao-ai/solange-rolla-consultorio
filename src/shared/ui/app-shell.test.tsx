import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ pathname: '/dashboard' as string | null }))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))

import { AppShell } from './app-shell'

afterEach(() => {
  navigation.pathname = '/dashboard'
})

describe('AppShell', () => {
  it('uses the branded private-workspace shell', () => {
    const html = renderToStaticMarkup(<AppShell><p>Conteúdo</p></AppShell>)
    expect(html).toContain('solange-rolla-logo.png')
    expect(html).toContain('Gestão do consultório')
    expect(html).toContain('Ambiente privado e rastreável')
  })

  it('renders safely while Next has no current pathname yet', () => {
    navigation.pathname = null

    expect(() => renderToStaticMarkup(<AppShell><p>Conteúdo</p></AppShell>)).not.toThrow()
  })
})
