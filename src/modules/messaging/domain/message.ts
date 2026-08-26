export const MESSAGE_CHANNELS = ['whatsapp', 'email'] as const
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number]

export type OutboundMessage = {
  id: string
  idempotencyKey: string
  channel: MessageChannel
  recipient: string
  templateKey: string
  payload: Record<string, string>
  status: 'queued' | 'dispatched' | 'sent' | 'failed'
}

export function assertAdministrativePayload(payload: Record<string, string>): void {
  const forbidden = /clinical|diagnos|therapy|form[_ ]?answer|notes|cpf/i
  if (Object.keys(payload).some((key) => forbidden.test(key)) || Object.values(payload).some((value) => forbidden.test(value))) {
    throw new Error('CLINICAL_CONTENT_FORBIDDEN_IN_MESSAGE')
  }
}
