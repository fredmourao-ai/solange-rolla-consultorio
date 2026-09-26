import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { Json } from '../../../platform/supabase/types'
import type { ProviderEvent, ProviderEventRepository } from '../application/ingest-provider-event'

type MessagingClient = ReturnType<typeof createServiceRoleSupabaseClient>

type JsonObject = { [key: string]: Json | undefined }

function toJsonValue(value: unknown): Json | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PROVIDER_EVENT_PAYLOAD_NOT_JSON')
    return value
  }
  if (Array.isArray(value)) return value.map((item) => {
    const converted = toJsonValue(item)
    if (converted === undefined) throw new Error('PROVIDER_EVENT_PAYLOAD_NOT_JSON')
    return converted
  })
  if (typeof value === 'object') return toJsonObject(value as Record<string, unknown>)
  throw new Error('PROVIDER_EVENT_PAYLOAD_NOT_JSON')
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  const result: JsonObject = {}
  for (const [key, item] of Object.entries(value)) {
    const converted = toJsonValue(item)
    if (converted !== undefined) result[key] = converted
  }
  return result
}

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
        .insert({ provider: event.provider, provider_event_id: event.providerEventId, payload: toJsonObject(event.payload) })
      if (error) {
        if (error.code === '23505') return false
        throw error
      }
      return true
    },
  }
}
