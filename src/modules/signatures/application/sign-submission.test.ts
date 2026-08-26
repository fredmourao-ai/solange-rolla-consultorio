import { describe, expect, it } from 'vitest'
import { signSubmission } from './sign-submission'

describe('sign submission', () => {
  it('stores hash evidence without copying answers and enqueues one idempotent job', async () => {
    const calls: Record<string, unknown>[] = []
    const result = await signSubmission({
      submissionVersionId: 'version-1',
      declarationVersion: 'terms-2026-01',
      typedName: 'Paciente Fictício',
      source: 'patient_capability',
      answers: { clinical_note: 'SENSITIVE_SENTINEL' },
      idempotencyKey: 'sign:version-1',
    }, {
      createEvidence: async (evidence) => {
        calls.push(evidence)
        return { id: 'evidence-1', ...evidence }
      },
      enqueueDocument: async (job) => ({ id: 'job-1', ...job }),
    })

    expect(result.evidence).toHaveProperty('canonicalHashSha256')
    expect(JSON.stringify(calls)).not.toContain('SENSITIVE_SENTINEL')
    expect(result.job).toMatchObject({ idempotencyKey: 'sign:version-1', signatureEvidenceId: 'evidence-1' })
  })
})
