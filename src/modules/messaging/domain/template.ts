import { assertAdministrativePayload, type MessageChannel } from './message'

export const MESSAGE_TEMPLATE_KEYS = [
  'appointment_confirmation', 'appointment_cancelled', 'reschedule_received',
  'payment_admin_reminder', 'event_reminder', 'birthday_greeting', 'form_link',
  'fiscal_document_ready',
] as const

export type MessageTemplateKey = (typeof MESSAGE_TEMPLATE_KEYS)[number]
export type MessageTemplate = { key: MessageTemplateKey; channel: MessageChannel; version: number; body: string; allowedTokens: readonly string[] }

export function renderTemplate(template: MessageTemplate, values: Record<string, string>): string {
  assertAdministrativePayload(values)
  for (const token of Object.keys(values)) {
    if (!template.allowedTokens.includes(token)) throw new Error('TEMPLATE_TOKEN_NOT_ALLOWED')
  }
  return template.body.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, token: string) => values[token] ?? '')
}
