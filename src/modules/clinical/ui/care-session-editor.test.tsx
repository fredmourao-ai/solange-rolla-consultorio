import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CareSessionEditor } from './care-session-editor'

const noop = async () => {}

describe('CareSessionEditor', () => {
  it('uses contextual hidden identifiers and professional field labels', () => {
    const html = renderToStaticMarkup(<CareSessionEditor
      personId="person-internal"
      appointmentId="appointment-internal"
      action={noop}
    />)

    expect(html).toContain('type="hidden" name="appointment_id" value="appointment-internal"')
    expect(html).toContain('type="hidden" name="person_id" value="person-internal"')
    expect(html).toContain('Evolução da sessão')
    expect(html).toContain('Procedimentos e intervenções')
    expect(html).toContain('Objetivos e foco terapêutico')
    expect(html).toContain('Finalizar atendimento e registrar evolução')
    expect(html).not.toContain('ID do atendimento')
    expect(html).not.toContain('UUID')
  })
})
