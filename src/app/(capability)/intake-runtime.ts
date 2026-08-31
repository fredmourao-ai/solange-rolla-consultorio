import 'server-only'
import { issuePublicActionToken } from '@/platform/security/action-token'
import { createPrivacySafeRateLimiter, createSupabaseRateLimitStore } from '@/platform/security/rate-limit'
import { createSupabasePublicActionNonceStore } from '@/platform/security/public-action-store'
import { createSensitiveDataCrypto } from '@/platform/crypto/aes-gcm'
import { serverEnv } from '@/platform/env/server'
import { createServiceRoleSupabaseClient } from '@/platform/supabase/service-role'
import { createSupabaseFormRepository } from '@/modules/forms/public'
import { createSupabaseLegalRepository } from '@/modules/forms/public'
import { createSupabaseSignatureRepository } from '@/modules/signatures/public'
import type { CapabilitySessionRecord } from '@/platform/capabilities/session'

export function createPublicIntakeRuntime(session: CapabilitySessionRecord) {
  const env = serverEnv()
  const client = createServiceRoleSupabaseClient()
  const formRepository = createSupabaseFormRepository(client)
  const crypto = createSensitiveDataCrypto()
  const nonceStore = createSupabasePublicActionNonceStore(client)
  const rateLimiter = createPrivacySafeRateLimiter({
    secret: env.RATE_LIMIT_HMAC_KEY,
    store: createSupabaseRateLimitStore(async (args) => {
      const { data, error } = await client.rpc('consume_public_rate_limit', args as never)
      return { data: data as never, error: error ? new Error(error.message) : null }
    }),
  })

  return {
    env,
    client,
    formRepository,
    legalRepository: createSupabaseLegalRepository(session.id, client),
    signatureRepository: createSupabaseSignatureRepository(client),
    crypto,
    nonceStore,
    rateLimiter,
    issueActionToken: (input: { capabilitySessionId: string; purpose: string; subjectId: string }) =>
      issuePublicActionToken({ ...input, secret: env.PUBLIC_ACTION_HMAC_KEY }),
  }
}
