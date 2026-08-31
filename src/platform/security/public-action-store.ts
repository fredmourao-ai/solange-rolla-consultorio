import 'server-only'
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types'
import { createServiceRoleSupabaseClient } from '../supabase/service-role'

export function hashPublicActionNonce(nonce: string): string {
  if (!nonce) throw new Error('ACTION_NONCE_REQUIRED')
  return createHash('sha256').update(nonce, 'utf8').digest('hex')
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '')
  }
  return undefined
}

function databaseError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message ?? 'PUBLIC_ACTION_NONCE_STORE_UNAVAILABLE'))
  }
  return new Error('PUBLIC_ACTION_NONCE_STORE_UNAVAILABLE')
}
export function createSupabasePublicActionNonceStore(
  client: SupabaseClient<Database> = createServiceRoleSupabaseClient(),
) {
  return {
    async consumeOnce(nonce: string): Promise<boolean> {
      const { error } = await client.from('public_action_nonces').insert({
        nonce_hash: hashPublicActionNonce(nonce),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      if (!error) return true
      if (errorCode(error) === '23505') return false
      throw databaseError(error)
    },
  }
}
