import { describe, expect, it } from 'vitest'
import { createSupabaseSignatureRepository } from './supabase-signature-repository'

function fakeClient() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  const rows: Record<string, unknown> = {
    document_jobs: {
      id: 'job-1', idempotency_key: 'signed-form:version-1', signature_evidence_id: 'evidence-1',
    },
    signature_evidence: {
      id: 'evidence-1', submission_version_id: 'version-1', declaration_version: 'terms-v1',
      typed_name: 'Paciente Sintético', source: 'patient_capability',
      canonical_hash_sha256: 'a'.repeat(64), signed_at: '2026-08-29T00:00:00.000Z',
    },
  }
  const client = {
    from(table: string) {
      return {
        select() {
          const query = {
            eq() { return query },
            maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
          }
          return query
        },
      }
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args })
      return { data: [{
        result_evidence_id: 'evidence-1', result_submission_version_id: 'version-1',
        result_declaration_version: 'terms-v1', result_typed_name: 'Paciente Sintético',
        result_source: 'patient_capability', result_canonical_hash_sha256: 'a'.repeat(64),
        result_signed_at: '2026-08-29T00:00:00.000Z', result_job_id: 'job-1',
        result_idempotency_key: 'signed-form:version-1', result_signature_evidence_id: 'evidence-1',
      }], error: null }
    },
  }
  return { client, rpcCalls }
}

describe('supabase signature repository', () => {
  it('loads an existing idempotent signature', async () => {
    const { client } = fakeClient()
    const repository = createSupabaseSignatureRepository(client as never)
    await expect(repository.findByIdempotencyKey('signed-form:version-1')).resolves.toMatchObject({
      evidence: { id: 'evidence-1', submissionVersionId: 'version-1' },
      job: { id: 'job-1', signatureEvidenceId: 'evidence-1' },
    })
  })

  it('delegates atomic signing to the database RPC', async () => {
    const { client, rpcCalls } = fakeClient()
    const repository = createSupabaseSignatureRepository(client as never)
    const result = await repository.signAtomically({
      evidence: {
        submissionVersionId: 'version-1', declarationVersion: 'terms-v1',
        typedName: 'Paciente Sintético', source: 'patient_capability',
        canonicalHashSha256: 'a'.repeat(64), signedAt: '2026-08-29T00:00:00.000Z',
      },
      idempotencyKey: 'signed-form:version-1',
    })
    expect(result).toMatchObject({ evidence: { id: 'evidence-1' }, job: { id: 'job-1' } })
    expect(rpcCalls).toEqual([{
      name: 'sign_form_submission',
      args: expect.objectContaining({
        p_submission_version_id: 'version-1',
        p_canonical_hash_sha256: 'a'.repeat(64),
        p_idempotency_key: 'signed-form:version-1',
      }),
    }])
  })
})
