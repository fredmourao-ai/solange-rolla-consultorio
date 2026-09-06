import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PersonForm } from './person-form'

describe('PersonForm fiscal readiness', () => {
  it('offers fiscal address fields without requiring database intervention', () => {
    const markup = renderToStaticMarkup(<PersonForm action={async () => undefined} />)

    expect(markup).toContain('name="fiscal_street"')
    expect(markup).toContain('name="fiscal_number"')
    expect(markup).toContain('name="fiscal_district"')
    expect(markup).toContain('name="fiscal_city"')
    expect(markup).toContain('name="fiscal_state"')
    expect(markup).toContain('name="fiscal_postal_code"')
    expect(markup).toContain('Dados fiscais')
  })
})
