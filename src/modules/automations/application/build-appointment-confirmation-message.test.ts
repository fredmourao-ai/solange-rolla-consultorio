import { describe, expect, it } from 'vitest'
import { buildAppointmentConfirmationMessage } from './build-appointment-confirmation-message'

const base = {
  idempotencyKey: 'appointment:appt-1:confirmation:2026-09-05',
  startsAt: new Date('2026-09-05T15:00:00.000Z'),
  secureLink: 'https://app.test/c/raw-token?purpose=appointment_response',
}

describe('buildAppointmentConfirmationMessage', () => {
  it('builds a whatsapp message from the phone number in Sao Paulo local time', () => {
    const message = buildAppointmentConfirmationMessage({
      ...base,
      person: { preferredName: 'Maria', phoneE164: '+5511999999999', emailNormalized: null, preferredChannel: 'whatsapp' },
    })
    expect(message).toEqual({
      idempotencyKey: base.idempotencyKey,
      channel: 'whatsapp',
      recipient: '+5511999999999',
      templateKey: 'appointment_confirmation',
      payload: { preferredName: 'Maria', appointmentDate: '05/09/2026', appointmentTime: '12:00', secureLink: base.secureLink },
    })
  })

  it('builds an email message from the normalized email', () => {
    const message = buildAppointmentConfirmationMessage({
      ...base,
      person: { preferredName: 'Maria', phoneE164: null, emailNormalized: 'maria@example.com', preferredChannel: 'email' },
    })
    expect(message?.channel).toBe('email')
    expect(message?.recipient).toBe('maria@example.com')
  })

  it('skips when the preferred channel has no template-capable contact configured', () => {
    expect(buildAppointmentConfirmationMessage({
      ...base,
      person: { preferredName: 'Maria', phoneE164: null, emailNormalized: null, preferredChannel: 'none' },
    })).toBeNull()
  })

  it('skips whatsapp when no phone is on file even if preferred', () => {
    expect(buildAppointmentConfirmationMessage({
      ...base,
      person: { preferredName: 'Maria', phoneE164: null, emailNormalized: 'maria@example.com', preferredChannel: 'whatsapp' },
    })).toBeNull()
  })

  it('skips a phone-only preference since calls are not a templated channel', () => {
    expect(buildAppointmentConfirmationMessage({
      ...base,
      person: { preferredName: 'Maria', phoneE164: '+5511999999999', emailNormalized: null, preferredChannel: 'phone' },
    })).toBeNull()
  })
})
