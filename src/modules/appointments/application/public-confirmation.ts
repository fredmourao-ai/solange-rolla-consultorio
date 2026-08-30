import 'server-only'
import type { CapabilitySessionRecord } from '../../../platform/capabilities/session'
import { createPublicActionContext } from '../../../platform/security/public-action'
import { requireTrustedOrigin } from '../../../platform/security/origin'
import type { RateLimitResult } from '../../../platform/security/rate-limit'
import { respondToConfirmation, type ConfirmationAction } from './respond-to-confirmation'

type Dependencies = {
  repository: Parameters<typeof respondToConfirmation>[1]
  allowedOrigins: readonly string[]
  actionSecret: string
  nonceStore: { consumeOnce(nonce: string): Promise<boolean> }
  rateLimiter: {
    consume(input: { scope: string; subjectKey: string; limit: number; windowSeconds: number }): Promise<RateLimitResult>
  }
}

type Input = {
  session: CapabilitySessionRecord
  request: Request
  actionToken: string
  action: ConfirmationAction
  acknowledgeLateCharge?: boolean
  now?: Date
}
export async function respondToPublicConfirmation(input: Input, dependencies: Dependencies) {
  if (input.session.purpose !== 'appointment_response' || input.session.subjectType !== 'appointment') {
    throw new Error('CAPABILITY_SCOPE_INVALID')
  }
  requireTrustedOrigin(input.request, dependencies.allowedOrigins)
  const limit = await dependencies.rateLimiter.consume({
    scope: 'appointment_response', subjectKey: input.session.id, limit: 12, windowSeconds: 300,
  })
  if (!limit.allowed) throw new Error('PUBLIC_RATE_LIMITED')

  const context = await createPublicActionContext({
    request: input.request, allowedOrigins: dependencies.allowedOrigins,
    token: input.actionToken, secret: dependencies.actionSecret,
    capabilitySessionId: input.session.id, purpose: 'appointment_response',
    subjectId: input.session.subjectId, store: dependencies.nonceStore, now: input.now,
  })
  return respondToConfirmation({
    appointmentId: input.session.subjectId, action: input.action,
    acknowledgeLateCharge: input.acknowledgeLateCharge,
    publicActionContext: context, now: input.now,
  }, dependencies.repository)
}
