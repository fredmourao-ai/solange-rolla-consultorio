import { formatBusinessDateTime } from '../../../shared/kernel/format/date'

export type ConfirmationRecipient = {
  preferredName: string
  phoneE164: string | null
  emailNormalized: string | null
  preferredChannel: 'whatsapp' | 'email' | 'phone' | 'none'
}

export type AppointmentConfirmationMessage = {
  idempotencyKey: string
  channel: 'whatsapp' | 'email'
  recipient: string
  templateKey: 'appointment_confirmation'
  payload: { preferredName: string; appointmentDate: string; appointmentTime: string; secureLink: string }
}

export type ResolvedConfirmationRecipient = { channel: 'whatsapp' | 'email'; recipient: string }

export function resolveConfirmationRecipient(person: ConfirmationRecipient): ResolvedConfirmationRecipient | null {
  const channel = person.preferredChannel
  if (channel !== 'whatsapp' && channel !== 'email') return null
  const recipient = channel === 'whatsapp' ? person.phoneE164 : person.emailNormalized
  if (!recipient) return null
  return { channel, recipient }
}

export function buildAppointmentConfirmationMessage(input: {
  idempotencyKey: string
  startsAt: Date
  person: ConfirmationRecipient
  secureLink: string
}): AppointmentConfirmationMessage | null {
  const resolved = resolveConfirmationRecipient(input.person)
  if (!resolved) return null

  const [appointmentDate, appointmentTime] = formatBusinessDateTime(input.startsAt).split(' ')
  return {
    idempotencyKey: input.idempotencyKey,
    channel: resolved.channel,
    recipient: resolved.recipient,
    templateKey: 'appointment_confirmation',
    payload: { preferredName: input.person.preferredName, appointmentDate, appointmentTime, secureLink: input.secureLink },
  }
}
