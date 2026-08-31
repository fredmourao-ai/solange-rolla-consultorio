import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { DocumentDispatchRepository } from '../application/dispatch-document-jobs'

type SignatureClient = ReturnType<typeof createServiceRoleSupabaseClient>

export function createSupabaseDocumentDispatchRepository(
  client: SignatureClient = createServiceRoleSupabaseClient(),
): DocumentDispatchRepository {
  return {
    async claimPending(limit) {
      const { data, error } = await client.rpc('claim_document_jobs', { p_limit: limit })
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.result_id,
        idempotencyKey: row.result_idempotency_key,
      }))
    },

    async markDispatched(jobId, dispatchedAt) {
      const { error } = await client
        .from('document_jobs')
        .update({ status: 'processing', dispatched_at: dispatchedAt, last_error_code: null })
        .eq('id', jobId)
      if (error) throw error
    },

    async releaseDispatch(jobId, errorCode) {
      const { error } = await client
        .from('document_jobs')
        .update({ status: 'failed_retryable', dispatched_at: null, last_error_code: errorCode })
        .eq('id', jobId)
      if (error) throw error
    },
  }
}
