import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { OutboxRepository } from '../application/dispatch-outbox'
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

/**
 * Claims queued messages by atomically stamping `dispatched_at` -- the
 * candidate select and the conditional update both re-check
 * `status=queued AND dispatched_at IS NULL`, so a concurrent claimer racing
 * for the same row simply gets it excluded from its own RETURNING set
 * instead of double-dispatching it. `status` itself only flips to
 * `dispatched` once the queue send actually succeeds, via markDispatched.
 */
export function createSupabaseOutboxRepository(client: MessagingClient = createServiceRoleSupabaseClient()): OutboxRepository {
  return {
    async claimQueued(limit: number): Promise<OutboundMessage[]> {
      const { data: candidates, error: selectError } = await client
        .from('outbound_messages')
        .select('id')
        .eq('status', 'queued')
        .is('dispatched_at', null)
        .order('created_at', { ascending: true })
        .limit(Math.max(1, Math.min(100, limit)))
      if (selectError) throw selectError
      const ids = (candidates ?? []).map((row) => row.id)
      if (ids.length === 0) return []

      const { data: claimed, error: updateError } = await client
        .from('outbound_messages')
        .update({ dispatched_at: new Date().toISOString() })
        .in('id', ids)
        .eq('status', 'queued')
        .is('dispatched_at', null)
        .select('id,idempotency_key,channel,recipient,template_key,payload,status')
      if (updateError) throw updateError
      return (claimed ?? []).map(toDomain)
    },

    async markDispatched(id: string): Promise<void> {
      const { error } = await client
        .from('outbound_messages')
        .update({ status: 'dispatched' })
        .eq('id', id)
      if (error) throw error
    },
  }
}
