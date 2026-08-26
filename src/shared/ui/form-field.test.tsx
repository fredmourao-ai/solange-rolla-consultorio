import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FormField } from './form-field'

describe('FormField', () => {
  it('connects label, description, and error to the control', () => {
    const markup = renderToStaticMarkup(
      <FormField
        id="display-name"
        label="Nome de exibição"
        description="Usado apenas na agenda interna."
        error="Informe um nome."
      >
        <input id="display-name" />
      </FormField>,
    )

    expect(markup).toContain('for="display-name"')
    expect(markup).toContain('id="display-name-description"')
    expect(markup).toContain('id="display-name-error"')
    expect(markup).toContain('aria-describedby="display-name-description display-name-error"')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('Informe um nome.')
  })

  it('preserves descriptions supplied by the composed control', () => {
    const markup = renderToStaticMarkup(
      <FormField id="email" label="E-mail" description="Uso operacional.">
        <input id="email" aria-describedby="existing-help" />
      </FormField>,
    )

    expect(markup).toContain('aria-describedby="existing-help email-description"')
  })
})
