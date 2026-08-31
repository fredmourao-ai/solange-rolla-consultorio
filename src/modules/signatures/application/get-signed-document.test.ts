import { describe, expect, it, vi } from 'vitest'
import { getSignedDocument } from './get-signed-document'

function readyRecord() {
  return {
    evidenceId: '22222222-2222-4222-8222-222222222222',
    documentStatus: 'ready',
    storagePath: 'signed/22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111.pdf',
    sha256: 'a'.repeat(64),
    byteLength: 2048,
  }
}

describe('getSignedDocument', () => {
  it('authorizes before returning a short-lived URL for a ready document', async () => {
    const order: string[] = []
    const result = await getSignedDocument(readyRecord().evidenceId, {
      authorizeOwnerAal2: async () => { order.push('authorize') },
      repository: { findByEvidenceId: vi.fn(async () => { order.push('read'); return readyRecord() }) },
      storage: { createShortLivedDownloadUrl: vi.fn(async () => { order.push('sign'); return 'https://signed.example.test/document.pdf' }) },
    })

    expect(result).toEqual({
      status: 'ready',
      url: 'https://signed.example.test/document.pdf',
      sha256: 'a'.repeat(64),
      byteLength: 2048,
    })
    expect(order).toEqual(['authorize', 'read', 'sign'])
  })

  it('returns normalized pending status without signing a URL', async () => {
    const createShortLivedDownloadUrl = vi.fn()
    await expect(getSignedDocument('evidence-1', {
      authorizeOwnerAal2: async () => undefined,
      repository: { findByEvidenceId: vi.fn(async () => ({
        ...readyRecord(), evidenceId: 'evidence-1', documentStatus: 'queued', storagePath: null, sha256: null, byteLength: null,
      })) },
      storage: { createShortLivedDownloadUrl },
    })).resolves.toEqual({ status: 'pending' })
    expect(createShortLivedDownloadUrl).not.toHaveBeenCalled()
  })

  it('denies access before reading or signing when owner AAL2 authorization fails', async () => {
    const findByEvidenceId = vi.fn()
    const createShortLivedDownloadUrl = vi.fn()

    await expect(getSignedDocument('evidence-1', {
      authorizeOwnerAal2: async () => { throw new Error('ROLE_FORBIDDEN') },
      repository: { findByEvidenceId },
      storage: { createShortLivedDownloadUrl },
    })).rejects.toThrow('ROLE_FORBIDDEN')

    expect(findByEvidenceId).not.toHaveBeenCalled()
    expect(createShortLivedDownloadUrl).not.toHaveBeenCalled()
  })

  it('fails closed when ready artifact metadata is incomplete', async () => {
    await expect(getSignedDocument('evidence-1', {
      authorizeOwnerAal2: async () => undefined,
      repository: { findByEvidenceId: vi.fn(async () => ({
        ...readyRecord(), evidenceId: 'evidence-1', storagePath: null,
      })) },
      storage: { createShortLivedDownloadUrl: vi.fn() },
    })).rejects.toThrow('SIGNED_DOCUMENT_ARTIFACT_INVALID')
  })
})
