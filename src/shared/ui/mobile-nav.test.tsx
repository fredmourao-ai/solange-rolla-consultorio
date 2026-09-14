import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MobileNav } from './mobile-nav'

describe('MobileNav', () => {
  it('renders the Solange Rolla brand mark as the dashboard link', () => {
    const html = renderToStaticMarkup(<MobileNav pathname="/dashboard" permissions={['patients.read']} />)
    expect(html).toContain('class="mobile-nav__brand"')
    expect(html).toContain('solange-rolla-logo.png')
    expect(html).toContain('aria-label="Solange Rolla - Início"')
    expect(html).toContain('Abrir menu')
    expect(html).toContain('aria-controls="mobile-navigation"')
  })
})
