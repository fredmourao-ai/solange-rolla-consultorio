import { describe, expect, it } from 'vitest'
import { renderTemplate } from './template'

describe('message templates', () => {
  const template = { key: 'appointment_confirmation' as const, channel: 'email' as const, version: 1, body: 'Olá {{preferredName}}, seu horário é {{appointmentDate}}.', allowedTokens: ['preferredName', 'appointmentDate'] }
  it('renders only approved administrative tokens', () => {
    expect(renderTemplate(template, { preferredName: 'Paciente', appointmentDate: '27/08' })).toContain('27/08')
  })
  it('rejects clinical placeholders and content', () => {
    expect(() => renderTemplate(template, { clinicalNote: 'secret' })).toThrow('CLINICAL_CONTENT_FORBIDDEN')
  })
})
