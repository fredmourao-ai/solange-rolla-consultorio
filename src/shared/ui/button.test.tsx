import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Button } from './button'
import { StatusBadge } from './status-badge'

describe('shared UI primitives', () => {
  it('renders a named enabled button with semantic variant classes', () => {
    const markup = renderToStaticMarkup(<Button variant="primary">Confirmar</Button>)

    expect(markup).toContain('<button')
    expect(markup).toContain('type="button"')
    expect(markup).toContain('aria-disabled="false"')
    expect(markup).toContain('ui-button--primary')
    expect(markup).toContain('>Confirmar</button>')
  })

  it('renders status meaning as text instead of color alone', () => {
    const markup = renderToStaticMarkup(<StatusBadge status="success">Pago</StatusBadge>)

    expect(markup).toContain('status-badge--success')
    expect(markup).toContain('aria-label="Status: Pago"')
    expect(markup).toContain('>Pago</span>')
  })
})
