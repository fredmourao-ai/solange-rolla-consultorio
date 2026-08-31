import { describe, expect, it, vi } from 'vitest'
import { createSupabaseSignedDocumentRepository } from './supabase-signed-document-repository'

const evidenceId = '22222222-2222-4222-8222-222222222222'
const jobId = '11111111-1111-4111-8111-111111111111'
const versionId = '33333333-3333-4333-8333-333333333333'
const submissionId = '44444444-4444-4444-8444-444444444444'
const templateVersionId = '55555555-5555-4555-8555-555555555555'
const templateId = '66666666-6666-4666-8666-666666666666'

function fakeClient(overrides: Record<string, unknown> = {}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  const rows: Record<string, unknown> = {
    document_jobs: { id: jobId, idempotency_key: 'signed-form:v1', signature_evidence_id: evidenceId, status: 'processing', document: null },
    signature_evidence: { id: evidenceId, submission_version_id: versionId, declaration_version: 'truth-v1', typed_name: 'Pessoa Sintética', signed_at: '2026-08-30T04:00:00.000Z', canonical_hash_sha256: 'a'.repeat(64), document_status: 'processing', document_storage_path: null, document_sha256: null, document_byte_length: null },
    form_submission_versions: { id: versionId, submission_id: submissionId, answers: null, answers_ciphertext: 'cipher', answers_iv: 'iv', answers_auth_tag: 'tag', key_version: 7 },
    form_submissions: { id: submissionId, template_version_id: templateVersionId },
    form_template_versions: { id: templateVersionId, template_id: templateId, version: 3, data_classification: 'sensitive', schema: { fields: [{ key: 'mood', label: 'Como está?', type: 'short_text', required: true }] } },
    form_templates: { id: templateId, name: 'Pré-consulta' },
    ...overrides,
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
      return { data: null, error: null }
    },
  }
  return { client, rpcCalls }
}

describe('supabase signed document repository', () => {
  it('decrypts sensitive answers with submission-scoped AAD and maps signed labels', async () => {
    const { client } = fakeClient()
    const decrypt = vi.fn(async () => JSON.stringify({ mood: 'SIGNED_DOC_SENSITIVE_SENTINEL' }))
    const repository = createSupabaseSignedDocumentRepository(client as never, { encrypt: vi.fn(), decrypt } as never)

    const source = await repository.loadSource(evidenceId)
    expect(decrypt).toHaveBeenCalledWith({
      alg: 'A256GCM', keyVersion: 7, iv: 'iv', ciphertext: 'cipher', authTag: 'tag',
    }, { entity: 'form_submission', id: submissionId })
    expect(source).toMatchObject({
      formName: 'Pré-consulta', formVersion: 3, declarationVersion: 'truth-v1',
      typedName: 'Pessoa Sintética', canonicalHashSha256: 'a'.repeat(64),
      fields: [{ label: 'Como está?', value: 'SIGNED_DOC_SENSITIVE_SENTINEL' }],
    })
  })

  it('uses administrative JSON without invoking decryption', async () => {
    const { client } = fakeClient({
      form_submission_versions: { id: versionId, submission_id: submissionId, answers: { mood: 'Bem' }, answers_ciphertext: null, answers_iv: null, answers_auth_tag: null, key_version: null },
      form_template_versions: { id: templateVersionId, template_id: templateId, version: 3, data_classification: 'administrative', schema: { fields: [{ key: 'mood', label: 'Estado', type: 'short_text', required: true }] } },
    })
    const decrypt = vi.fn()
    const repository = createSupabaseSignedDocumentRepository(client as never, { encrypt: vi.fn(), decrypt } as never)
    await expect(repository.loadSource(evidenceId)).resolves.toMatchObject({ fields: [{ label: 'Estado', value: 'Bem' }] })
    expect(decrypt).not.toHaveBeenCalled()
  })

  it('fails closed when sensitive envelope cannot be decrypted', async () => {
    const { client } = fakeClient()
    const repository = createSupabaseSignedDocumentRepository(client as never, {
      encrypt: vi.fn(), decrypt: vi.fn(async () => { throw new Error('bad tag') }),
    } as never)
    await expect(repository.loadSource(evidenceId)).rejects.toThrow('DOCUMENT_SOURCE_INTEGRITY_ERROR')
  })

  it('loads completed artifact metadata and persists ready result atomically', async () => {
    const { client, rpcCalls } = fakeClient({
      document_jobs: { id: jobId, idempotency_key: 'signed-form:v1', signature_evidence_id: evidenceId, status: 'completed' },
      signature_evidence: { id: evidenceId, submission_version_id: versionId, declaration_version: 'truth-v1', typed_name: 'Pessoa Sintética', signed_at: '2026-08-30T04:00:00.000Z', canonical_hash_sha256: 'a'.repeat(64), document_status: 'ready', document_storage_path: `signed/${evidenceId}/${jobId}.pdf`, document_sha256: 'b'.repeat(64), document_byte_length: 1234 },
    })
    const repository = createSupabaseSignedDocumentRepository(client as never, { encrypt: vi.fn(), decrypt: vi.fn() } as never)
    await expect(repository.findJob(jobId)).resolves.toMatchObject({ status: 'completed', artifact: { byteLength: 1234, sha256: 'b'.repeat(64) } })
    await repository.markReady(jobId, evidenceId, { storagePath: `signed/${evidenceId}/${jobId}.pdf`, sha256: 'c'.repeat(64), byteLength: 999, mediaType: 'application/pdf' })
    expect(rpcCalls.at(-1)).toEqual({ name: 'persist_document_job_result', args: expect.objectContaining({ p_job_id: jobId, p_evidence_id: evidenceId, p_result_status: 'ready', p_byte_length: 999 }) })
  })
})
