import { describe, expect, it, vi } from 'vitest'
import { renderSignedDocument } from './render-signed-document'

const job = {
  id: '11111111-1111-4111-8111-111111111111',
  evidenceId: '22222222-2222-4222-8222-222222222222',
  status: 'processing' as const,
  idempotencyKey: 'signed-form:version-1',
}
const source = {
  formName: 'Pré-consulta', formVersion: 1, declarationVersion: 'truth-v1',
  typedName: 'Pessoa Sintética', signedAt: '2026-08-30T04:00:00.000Z',
  canonicalHashSha256: 'a'.repeat(64),
  fields: [{ label: 'Resposta', value: 'SIGNED_DOC_SENSITIVE_SENTINEL' }],
}

describe('renderSignedDocument', () => {
  it('uploads one deterministic private artifact and persists its integrity metadata', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 49])
    const repository = {
      findJob: vi.fn(async () => ({ ...job, artifact: null })),
      loadSource: vi.fn(async () => source),
      markReady: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined),
    }
    const storage = { put: vi.fn(async () => undefined) }
    const renderer = vi.fn(async () => bytes)

    const result = await renderSignedDocument(job.id, { repository, storage, renderer })
    expect(result.storagePath).toBe(`signed/${job.evidenceId}/${job.id}.pdf`)
    expect(result.byteLength).toBe(bytes.byteLength)
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(storage.put).toHaveBeenCalledWith(result.storagePath, bytes, { contentType: 'application/pdf', upsert: false })
    expect(repository.markReady).toHaveBeenCalledWith(job.id, job.evidenceId, result)
  })

  it('returns the same logical artifact without rendering twice', async () => {
    const artifact = {
      storagePath: `signed/${job.evidenceId}/${job.id}.pdf`, sha256: 'b'.repeat(64),
      byteLength: 900, mediaType: 'application/pdf' as const,
    }
    const repository = {
      findJob: vi.fn(async () => ({ ...job, status: 'completed' as const, artifact })),
      loadSource: vi.fn(), markReady: vi.fn(), markFailed: vi.fn(),
    }
    const storage = { put: vi.fn() }
    const renderer = vi.fn()

    await expect(renderSignedDocument(job.id, { repository, storage, renderer })).resolves.toEqual(artifact)
    expect(repository.loadSource).not.toHaveBeenCalled()
    expect(renderer).not.toHaveBeenCalled()
    expect(storage.put).not.toHaveBeenCalled()
  })

  it('classifies storage failures as retryable without leaking source content', async () => {
    const repository = {
      findJob: vi.fn(async () => ({ ...job, artifact: null })), loadSource: vi.fn(async () => source),
      markReady: vi.fn(), markFailed: vi.fn(async () => undefined),
    }
    const storage = { put: vi.fn(async () => { throw new Error('network unavailable') }) }
    const renderer = vi.fn(async () => new Uint8Array([1, 2, 3]))

    await expect(renderSignedDocument(job.id, { repository, storage, renderer })).rejects.toThrow('DOCUMENT_STORAGE_FAILED')
    expect(repository.markFailed).toHaveBeenCalledWith(job.id, job.evidenceId, 'failed_retryable', 'DOCUMENT_STORAGE_FAILED')
    expect(JSON.stringify(repository.markFailed.mock.calls)).not.toContain('SIGNED_DOC_SENSITIVE_SENTINEL')
  })
})
