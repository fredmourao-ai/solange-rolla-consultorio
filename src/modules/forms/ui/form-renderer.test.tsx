import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { FormTemplateVersion } from '../domain/form-schema'
import { FormRenderer } from './form-renderer'

const template: FormTemplateVersion = {
  id: 'template-v1', version: 1, classification: 'sensitive',
  fields: [
    { key: 'name', type: 'short_text', required: true, label: 'Nome completo' },
    { key: 'email', type: 'email', required: false, label: 'E-mail' },
    { key: 'notes', type: 'long_text', required: false, label: 'Observacoes' },
    { key: 'channel', type: 'single_choice', required: true, label: 'Contato', options: ['WhatsApp', 'E-mail'] },
    { key: 'topics', type: 'multi_choice', required: false, label: 'Temas', options: ['Familia', 'Trabalho'] },
    { key: 'consent', type: 'declaration', required: true, label: 'Li e concordo', declaration: true },
  ],
}

describe('FormRenderer', () => {
  it('renders accessible touch-friendly controls from the versioned schema', () => {
    const html = renderToStaticMarkup(<FormRenderer
      template={template}
      answers={{ name: 'Pessoa Sintetica', channel: 'WhatsApp', topics: ['Familia'], consent: true }}
    />)

    expect(html).toContain('for="form-name"')
    expect(html).toContain('class="ui-input"')
    expect(html).toContain('type="email"')
    expect(html).toContain('class="ui-textarea"')
    expect(html).toContain('type="radio"')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('aria-required="true"')
    expect(html).toContain('value="Pessoa Sintetica"')
    expect(html).toContain('WhatsApp')
    expect(html).toContain('Familia')
  })
})
