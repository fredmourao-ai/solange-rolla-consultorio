import 'server-only'
import type { CapabilitySessionRecord } from '../../../platform/capabilities/session'
import { createPublicActionContext } from '../../../platform/security/public-action'
import { requireTrustedOrigin } from '../../../platform/security/origin'
import type { RateLimitResult } from '../../../platform/security/rate-limit'
import { signSubmission, type SignatureRepository, type SignSubmissionResult } from './sign-submission'

type PublicSignatureDependencies = {
  repository: SignatureRepository
  allowedOrigins: readonly string[]
  actionSecret: string
  nonceStore: { consumeOnce(nonce: string): Promise<boolean> }
  rateLimiter: {
    consume(input: { scope: string; subjectKey: string; limit: number; windowSeconds: number }): Promise<RateLimitResult>
  }
}

type PublicSignatureInput = {
  session: CapabilitySessionRecord
  request: Request
  actionToken: string
  submissionVersionId: string
  declarationVersion: string
  typedName: string
  answers: Record<string, unknown>
  acceptedLegalDocuments: Array<{ id: string; version: number; contentHash: string }>
}
export async function signPublicSubmission(
  input: PublicSignatureInput,
  dependencies: PublicSignatureDependencies,
): Promise<SignSubmissionResult> {
  if (input.session.purpose !== 'form_fill' || input.session.subjectType !== 'form_submission') {
    throw new Error('CAPABILITY_SCOPE_INVALID')
  }
  requireTrustedOrigin(input.request, dependencies.allowedOrigins)
  const limit = await dependencies.rateLimiter.consume({
    scope: 'signature_submit',
    subjectKey: input.session.id,
    limit: 6,
    windowSeconds: 300,
  })
  if (!limit.allowed) throw new Error('PUBLIC_RATE_LIMITED')

  const context = await createPublicActionContext({
    request: input.request,
    allowedOrigins: dependencies.allowedOrigins,
    token: input.actionToken,
    secret: dependencies.actionSecret,
    capabilitySessionId: input.session.id,
    purpose: 'sign_submission',
    subjectId: input.submissionVersionId,
    store: dependencies.nonceStore,
  })
  return signSubmission({
    submissionVersionId: input.submissionVersionId,
    declarationVersion: input.declarationVersion,
    typedName: input.typedName,
    source: 'patient_capability',
    answers: input.answers,
    idempotencyKey: `signed-form:${input.submissionVersionId}`,
    acceptedLegalDocuments: input.acceptedLegalDocuments,
    publicActionContext: context,
  }, dependencies.repository)
}
