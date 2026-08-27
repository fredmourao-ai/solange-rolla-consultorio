import 'server-only'
import type { CapabilityExchangeRepository } from './exchange'
import { createServiceRoleSupabaseClient } from '../supabase/service-role'

export function createCapabilityExchangeRepository(client = createServiceRoleSupabaseClient()): CapabilityExchangeRepository {
  return {
    async consume(tokenHash, purpose, now) {
      const { data, error } = await client.rpc('exchange_capability', { p_now: now.toISOString(), p_purpose: purpose, p_token_hash: tokenHash })
      if (error || !data?.[0]) return null
      const record = data[0]
      return {
        id: record.id,
        purpose: record.purpose,
        subjectType: record.subject_type as 'appointment' | 'form_submission',
        subjectId: record.subject_id,
        expiresAt: record.expires_at,
      }
    },
  }
}
