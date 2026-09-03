import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { Json } from '../../../platform/supabase/types'
import type { ProviderEvent, ProviderEventRepository } from '../application/ingest-provider-event'

type MessagingClient = ReturnType<typeof createServiceRoleSupabaseClient>

/**
 * Delivery-status (delivered/read receipt) application is intentionally not
 * implemented yet: outbound_messages.status only models
 * queued/dispatched/sent/failed, and there is no column correlating a
 * provider's external message id back to our row. Adding both is a schema
 * decision (new migration + likely an ADR per AGENTS.md #14 since it changes
 * what messaging tracks as source of truth) that should not be rushed inside
 * this change. insertIfNew still gives idempotent, deduplicated webhook
 * ingestion per AGENTS.md #8, which is the security-critical half.
 */
export function createSupabaseProviderEventRepository(client: MessagingClient = createServiceRoleSupabaseClient()): ProviderEventRepository {
  return {
    async insertIfNew(event: ProviderEvent): Promise<boolean> {
      const { error } = await client
        .from('inbox_events')
        .insert({ provider: event.provider, provider_event_id: event.providerEventId, payload: event.payload as Json })
      if (error) {
        if (error.code === '23505') return false
        throw error
      }
      return true
    },
  }
}
