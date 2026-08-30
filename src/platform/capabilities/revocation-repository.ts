import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import { createServiceRoleSupabaseClient } from '../supabase/service-role'
import type { CapabilityRevocationRepository } from './revoke-session'

export function createCapabilityRevocationRepository(
  client: SupabaseClient<Database> = createServiceRoleSupabaseClient(),
): CapabilityRevocationRepository {
  return {
    async revoke(id) {
      const { error } = await client
        .from('capabilities')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error('CAPABILITY_REVOKE_FAILED')
    },
  }
}
