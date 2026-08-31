import 'server-only'
import { issuePublicActionToken } from '@/platform/security/action-token'
import { createPrivacySafeRateLimiter, createSupabaseRateLimitStore } from '@/platform/security/rate-limit'
import { createSupabasePublicActionNonceStore } from '@/platform/security/public-action-store'
import { serverEnv } from '@/platform/env/server'
import { createServiceRoleSupabaseClient } from '@/platform/supabase/service-role'
import type { CapabilitySessionRecord } from '@/platform/capabilities/session'

export function createPublicAppointmentRuntime(session: CapabilitySessionRecord) {
  const env = serverEnv()
  const client = createServiceRoleSupabaseClient()
  const nonceStore = createSupabasePublicActionNonceStore(client)
  const rateLimiter = createPrivacySafeRateLimiter({
    secret: env.RATE_LIMIT_HMAC_KEY,
    store: createSupabaseRateLimitStore(async (args) => {
      const { data, error } = await client.rpc('consume_public_rate_limit', args as never)
      return { data: data as never, error: error ? new Error(error.message) : null }
    }),
  })

  const repository = {
    async getResponseState(id: string) {
      const { data, error } = await client.from('appointments').select('status,cancellation_deadline_at').eq('id', id).single()
      if (error || !data) throw new Error('APPOINTMENT_NOT_FOUND')
      return { status: data.status, cancellationDeadlineAt: data.cancellation_deadline_at }
    },
    async updateStatus(id: string, status: string, expectedStatus: string) {
      const response = status === 'confirmed' ? 'confirmed' : status === 'reschedule_requested' ? 'request_reschedule' : 'cancelled'
      const { data, error } = await client.rpc('persist_appointment_response' as never, {
        p_appointment_id: id, p_expected_status: expectedStatus, p_new_status: status,
        p_capability_id: session.id, p_response: response,
      } as never)
      if (error || typeof data !== 'string') throw new Error(error?.message ?? 'APPOINTMENT_UPDATE_FAILED')
      return { status: data }
    },
    async createRescheduleTask(id: string) { return id },
  }

  return {
    env, client, repository, nonceStore, rateLimiter, now: () => new Date(),
    issueActionToken: () => issuePublicActionToken({
      capabilitySessionId: session.id,
      purpose: 'appointment_response',
      subjectId: session.subjectId,
      secret: env.PUBLIC_ACTION_HMAC_KEY,
    }),
  }
}
