import { describe, expect, it } from 'vitest'
import { issuePublicActionToken } from '../../../platform/security/action-token'
import { createInMemoryRateLimitStore, createPrivacySafeRateLimiter } from '../../../platform/security/rate-limit'
import { signPublicSubmission } from './public-signature'

const secret = 's'.repeat(32)
const session = {
  id: 'cap-1', purpose: 'form_fill', subjectType: 'form_submission' as const, subjectId: 'sub-1',
  expiresAt: '2026-08-29T12:00:00.000Z', usedAt: '2026-08-29T00:00:00.000Z', revokedAt: null,
}

function dependencies(writes: unknown[]) {
  const nonces = new Set<string>()
  return {
    repository: {
      findByIdempotencyKey: async () => null,
      signAtomically: async (input: unknown) => {
        writes.push(input)
        return {
          evidence: { id: 'evidence-1', submissionVersionId: 'version-1', declarationVersion: 'truth-v2', typedName: 'Pessoa Sintética', source: 'patient_capability' as const, canonicalHashSha256: 'a'.repeat(64), signedAt: '2026-08-29T01:00:00.000Z' },
          job: { id: 'job-1', idempotencyKey: 'signed-form:version-1', signatureEvidenceId: 'evidence-1' },
        }
      },
    },
    allowedOrigins: ['https://app.test'],
    actionSecret: secret,
    nonceStore: {
      async consumeOnce(nonce: string) {
        if (nonces.has(nonce)) return false
        nonces.add(nonce)
        return true
      },
    },
    rateLimiter: createPrivacySafeRateLimiter({ secret: 'r'.repeat(32), store: createInMemoryRateLimitStore() }),
  }
}

function token() {
  return issuePublicActionToken({
    capabilitySessionId: session.id,
    purpose: 'sign_submission',
    subjectId: 'version-1',
    secret,
  }).token
}

const legalDocuments = [{ id: 'legal-v2', version: 2, contentHash: 'b'.repeat(64) }]
const answers = { name: 'Pessoa Sintética' }
describe('public signature mutation', () => {
  it('signs only the server-selected submission version', async () => {
    const writes: unknown[] = []
    const result = await signPublicSubmission({
      session,
      request: new Request('https://app.test/formulario/assinar', { method: 'POST', headers: { origin: 'https://app.test' } }),
      actionToken: token(),
      submissionVersionId: 'version-1',
      declarationVersion: 'truth-v2',
      typedName: 'Pessoa Sintética',
      answers,
      acceptedLegalDocuments: legalDocuments,
    }, dependencies(writes))

    expect(result).toMatchObject({ evidence: { id: 'evidence-1' }, job: { id: 'job-1' } })
    expect(writes).toHaveLength(1)
  })

  it('rejects cross-origin signing before the repository is called', async () => {
    const writes: unknown[] = []
    await expect(signPublicSubmission({
      session,
      request: new Request('https://app.test/formulario/assinar', { method: 'POST', headers: { origin: 'https://evil.test' } }),
      actionToken: token(), submissionVersionId: 'version-1', declarationVersion: 'truth-v2', typedName: 'Pessoa Sintética',
      answers, acceptedLegalDocuments: legalDocuments,
    }, dependencies(writes))).rejects.toThrow('TRUSTED_ORIGIN_REQUIRED')
    expect(writes).toHaveLength(0)
  })
})
