import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import { createServiceRoleSupabaseClient } from '../supabase/service-role'
import type { CapabilitySessionRepository } from './session'

export function createCapabilitySessionRepository(
  client: SupabaseClient<Database> = createServiceRoleSupabaseClient(),
): CapabilitySessionRepository {
  return {
    async findById(id) {
      const { data, error } = await client
        .from('capabilities')
        .select('id,purpose,subject_type,subject_id,expires_at,used_at,revoked_at')
        .eq('id', id)
        .maybeSingle()
      if (error || !data) return null
      if (data.subject_type !== 'appointment' && data.subject_type !== 'form_submission') return null
      return {
        id: data.id,
        purpose: data.purpose,
        subjectType: data.subject_type,
        subjectId: data.subject_id,
        expiresAt: data.expires_at,
        usedAt: data.used_at,
        revokedAt: data.revoked_at,
      }
    },
  }
}
