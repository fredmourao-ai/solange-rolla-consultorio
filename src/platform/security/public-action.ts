import 'server-only'
import { consumePublicActionToken } from './action-token'
import { requireTrustedOrigin } from './origin'

export type PublicActionContext = {
  origin: string
  capabilitySessionId: string
  purpose: string
  subjectId: string
}

export function assertPublicActionSubject(context: PublicActionContext | undefined, purpose: string, subjectId: string): void {
  if (!context || context.purpose !== purpose || context.subjectId !== subjectId) throw new Error('PUBLIC_ACTION_CONTEXT_REQUIRED')
}

export async function createPublicActionContext(input: {
  request: Request
  allowedOrigins: readonly string[]
  token: string
  secret: string
  capabilitySessionId: string
  purpose: string
  subjectId: string
  store: { consumeOnce(nonce: string): Promise<boolean> }
  now?: Date
}) {
  const origin = requireTrustedOrigin(input.request, input.allowedOrigins)
  const claims = await consumePublicActionToken(input.token, {
    secret: input.secret,
    capabilitySessionId: input.capabilitySessionId,
    purpose: input.purpose,
    subjectId: input.subjectId,
    store: input.store,
    now: input.now,
  })
  return { origin, capabilitySessionId: claims.capabilitySessionId, purpose: claims.purpose, subjectId: claims.subjectId }
}
