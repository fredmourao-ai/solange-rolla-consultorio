import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SidebarNav } from './sidebar-nav'

describe('SidebarNav', () => {
  it('links only to operational top-level routes', () => {
    const html = renderToStaticMarkup(<SidebarNav />)
    expect(html).toContain('href="/pessoas"')
    expect(html).toContain('href="/agenda"')
    expect(html).toContain('href="/eventos"')
    expect(html).toContain('href="/financeiro"')
    expect(html).toContain('href="/fiscal"')
    expect(html).toContain('href="/relatorios"')
    expect(html).not.toContain('href="/people"')
    expect(html).not.toContain('href="/appointments"')
    expect(html).not.toContain('href="/clinical"')
  })
})
