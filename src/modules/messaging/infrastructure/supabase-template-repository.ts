import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { TemplateRepository } from '../application/render-template'
import type { MessageTemplate, MessageTemplateKey } from '../domain/template'
import { MESSAGE_TEMPLATE_KEYS } from '../domain/template'

type MessagingClient = ReturnType<typeof createServiceRoleSupabaseClient>

const ALLOWED_TOKENS_BY_KEY: Record<MessageTemplateKey, readonly string[]> = {
  appointment_confirmation: ['preferredName', 'appointmentDate', 'appointmentTime', 'secureLink'],
  appointment_cancelled: ['preferredName', 'appointmentDate', 'appointmentTime'],
  reschedule_received: ['preferredName', 'appointmentDate', 'appointmentTime'],
  payment_admin_reminder: ['preferredName', 'deadlineDate', 'deadlineTime'],
  event_reminder: ['preferredName', 'appointmentDate', 'appointmentTime'],
  birthday_greeting: ['preferredName'],
  form_link: ['preferredName', 'secureLink'],
  fiscal_document_ready: ['preferredName', 'secureLink'],
}

function isTemplateKey(value: string): value is MessageTemplateKey {
  return (MESSAGE_TEMPLATE_KEYS as readonly string[]).includes(value)
}

export function createSupabaseTemplateRepository(client: MessagingClient = createServiceRoleSupabaseClient()): TemplateRepository {
  return {
    async find(key: string, channel: 'whatsapp' | 'email', version: number): Promise<MessageTemplate | null> {
      if (!isTemplateKey(key)) return null
      const { data, error } = await client
        .from('message_templates')
        .select('key,channel,version,body,active')
        .eq('key', key)
        .eq('channel', channel)
        .eq('version', version)
        .eq('active', true)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        key: data.key as MessageTemplateKey,
        channel: data.channel as MessageTemplate['channel'],
        version: data.version,
        body: data.body,
        allowedTokens: ALLOWED_TOKENS_BY_KEY[data.key as MessageTemplateKey],
      }
    },
  }
}
