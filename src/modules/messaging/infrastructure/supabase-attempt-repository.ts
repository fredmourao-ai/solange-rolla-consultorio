import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { MessageAttemptRepository } from '../application/process-message'

type MessagingClient = ReturnType<typeof createServiceRoleSupabaseClient>

export function createSupabaseMessageAttemptRepository(client: MessagingClient = createServiceRoleSupabaseClient()): MessageAttemptRepository {
  return {
    async appendAttempt(input: { messageId: string; attemptNumber: number; status: string; errorCode?: string }): Promise<void> {
      const { error } = await client
        .from('message_attempts')
        .upsert({
          outbound_message_id: input.messageId,
          attempt_number: input.attemptNumber,
          provider_status: input.status,
          error_code: input.errorCode ?? null,
        }, { onConflict: 'outbound_message_id,attempt_number' })
      if (error) throw error
    },

    async markSent(messageId: string): Promise<void> {
      const { error } = await client.from('outbound_messages').update({ status: 'sent' }).eq('id', messageId)
      if (error) throw error
    },

    async markFailed(messageId: string): Promise<void> {
      const { error } = await client.from('outbound_messages').update({ status: 'failed' }).eq('id', messageId)
      if (error) throw error
    },
  }
}
