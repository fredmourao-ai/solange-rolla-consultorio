import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { EnqueueMessageInput, MessageRepository } from '../application/enqueue-message'
import type { OutboundMessage } from '../domain/message'

type MessagingClient = ReturnType<typeof createServiceRoleSupabaseClient>

function toDomain(row: {
  id: string
  idempotency_key: string
  channel: string
  recipient: string
  template_key: string
  payload: unknown
  status: string
}): OutboundMessage {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    channel: row.channel as OutboundMessage['channel'],
    recipient: row.recipient,
    templateKey: row.template_key,
    payload: (row.payload ?? {}) as Record<string, string>,
    status: row.status as OutboundMessage['status'],
  }
}

export function createSupabaseMessageRepository(
  client: MessagingClient = createServiceRoleSupabaseClient(),
): MessageRepository & { findById(id: string): Promise<OutboundMessage | null> } {
  return {
    async findById(id: string): Promise<OutboundMessage | null> {
      const { data, error } = await client
        .from('outbound_messages')
        .select('id,idempotency_key,channel,recipient,template_key,payload,status')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? toDomain(data) : null
    },

    async findByIdempotencyKey(key: string): Promise<OutboundMessage | null> {
      const { data, error } = await client
        .from('outbound_messages')
        .select('id,idempotency_key,channel,recipient,template_key,payload,status')
        .eq('idempotency_key', key)
        .maybeSingle()
      if (error) throw error
      return data ? toDomain(data) : null
    },

    async insert(message: EnqueueMessageInput): Promise<OutboundMessage> {
      const { data, error } = await client
        .from('outbound_messages')
        .insert({
          idempotency_key: message.idempotencyKey,
          channel: message.channel,
          recipient: message.recipient,
          template_key: message.templateKey,
          payload: message.payload,
        })
        .select('id,idempotency_key,channel,recipient,template_key,payload,status')
        .single()
      if (error) {
        if (error.code === '23505') {
          const existing = await client
            .from('outbound_messages')
            .select('id,idempotency_key,channel,recipient,template_key,payload,status')
            .eq('idempotency_key', message.idempotencyKey)
            .maybeSingle()
          if (existing.error) throw existing.error
          if (existing.data) return toDomain(existing.data)
        }
        throw error
      }
      return toDomain(data)
    },
  }
}
