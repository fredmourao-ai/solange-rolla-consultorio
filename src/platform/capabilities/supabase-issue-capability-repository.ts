import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import { createServiceRoleSupabaseClient } from '../supabase/service-role'
import type { CapabilityIssuanceRepository } from './issue'

export function createSupabaseCapabilityIssuanceRepository(
  client: SupabaseClient<Database> = createServiceRoleSupabaseClient(),
): CapabilityIssuanceRepository {
  return {
    async insert(record) {
      const { data, error } = await client
        .from('capabilities')
        .insert({
          token_hash: record.tokenHash,
          purpose: record.purpose,
          subject_type: record.subjectType,
          subject_id: record.subjectId,
          expires_at: record.expiresAt,
        })
        .select('id')
        .single()
      if (error || !data) throw new Error(`CAPABILITY_ISSUANCE_FAILED:${error?.code ?? 'unknown'}`)
      return { id: data.id }
    },
  }
}
