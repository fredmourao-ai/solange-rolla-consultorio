import { describe, expect, it } from 'vitest'
import { signSubmission } from './sign-submission'

const baseInput = {
  submissionVersionId: 'version-1',
  declarationVersion: 'terms-2026-01',
  typedName: 'Paciente Ficticio',
  source: 'patient_capability' as const,
  publicActionContext: {
    origin: 'https://app.test', capabilitySessionId: 'session-1',
    purpose: 'sign_submission', subjectId: 'version-1',
  },
  answers: { clinical_note: 'SENSITIVE_SENTINEL' },
  idempotencyKey: 'signed-form:version-1',
  acceptedLegalDocuments: [
    { id: 'cancel-v1', version: 1, contentHash: 'hash-cancel' },
    { id: 'truth-v1', version: 1, contentHash: 'hash-truth' },
  ],
}

describe('sign submission', () => {
  it('stores hash evidence without copying answers in one atomic repository operation', async () => {
    const calls: Record<string, unknown>[] = []
    const result = await signSubmission(baseInput, {
      findByIdempotencyKey: async () => null,
      signAtomically: async (input) => {
        calls.push(input)
        const evidence = { id: 'evidence-1', ...input.evidence }
        return { evidence, job: { id: 'job-1', idempotencyKey: input.idempotencyKey, signatureEvidenceId: evidence.id } }
      },
    })

    expect(result.evidence).toHaveProperty('canonicalHashSha256')
    expect(JSON.stringify(calls)).not.toContain('SENSITIVE_SENTINEL')
    expect(result.job).toMatchObject({
      idempotencyKey: 'signed-form:version-1',
      signatureEvidenceId: 'evidence-1',
    })
    expect(calls).toHaveLength(1)
  })

  it('returns the existing signature for an idempotent retry', async () => {
    let atomicCalls = 0
    const first = await signSubmission(baseInput, {
      findByIdempotencyKey: async () => null,
      signAtomically: async (input) => ({
        evidence: { id: 'evidence-1', ...input.evidence },
        job: { id: 'job-1', idempotencyKey: input.idempotencyKey, signatureEvidenceId: 'evidence-1' },
      }),
    })
    const retried = await signSubmission(baseInput, {
      findByIdempotencyKey: async () => first,
      signAtomically: async () => { atomicCalls += 1; return first },
    })

    expect(retried).toEqual(first)
    expect(atomicCalls).toBe(0)
  })

  it('rejects reuse of the same idempotency key for different content', async () => {
    const existing = await signSubmission(baseInput, {
      findByIdempotencyKey: async () => null,
      signAtomically: async (input) => ({
        evidence: { id: 'evidence-1', ...input.evidence },
        job: { id: 'job-1', idempotencyKey: input.idempotencyKey, signatureEvidenceId: 'evidence-1' },
      }),
    })

    await expect(signSubmission({ ...baseInput, answers: { clinical_note: 'different' } }, {
      findByIdempotencyKey: async () => existing,
      signAtomically: async () => existing,
    })).rejects.toThrow('IDEMPOTENCY_KEY_CONFLICT')
  })

  it('rejects signing when a required legal document was not accepted', async () => {
    await expect(signSubmission({ ...baseInput, acceptedLegalDocuments: [] }, {
      findByIdempotencyKey: async () => null,
      signAtomically: async () => { throw new Error('must not persist') },
    })).rejects.toThrow('LEGAL_ACCEPTANCE_REQUIRED')
  })
})
