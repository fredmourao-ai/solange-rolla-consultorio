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

export function createSupabaseTemplateRepository(
  client: MessagingClient = createServiceRoleSupabaseClient(),
): TemplateRepository & { findActiveVersion(key: string, channel: 'whatsapp' | 'email'): Promise<number | null> } {
  return {
    /**
     * Resolves which version is currently active for a key+channel so a
     * caller (the messaging worker) can pass it to find()/renderVersionedTemplate
     * without needing to know the version number in advance. "Only one
     * active version per key+channel" is an application-level invariant,
     * not a DB constraint, so this defensively picks the highest version
     * rather than assuming exactly one row comes back.
     */
    async findActiveVersion(key: string, channel: 'whatsapp' | 'email'): Promise<number | null> {
      const { data, error } = await client
        .from('message_templates')
        .select('version')
        .eq('key', key)
        .eq('channel', channel)
        .eq('active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.version ?? null
    },

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
