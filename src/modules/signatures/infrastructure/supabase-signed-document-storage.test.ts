import { describe, expect, it, vi } from 'vitest'
import { createSupabaseSignedDocumentStorage } from './supabase-signed-document-storage'

const evidenceId = '22222222-2222-4222-8222-222222222222'
const jobId = '11111111-1111-4111-8111-111111111111'
const path = `signed/${evidenceId}/${jobId}.pdf`

function fakeClient(options: { uploadError?: unknown; existing?: Uint8Array } = {}) {
  const upload = vi.fn(async () => ({ data: options.uploadError ? null : { path }, error: options.uploadError ?? null }))
  const download = vi.fn(async () => ({
    data: options.existing ? { arrayBuffer: async () => options.existing!.slice().buffer as ArrayBuffer } : null,
    error: options.existing ? null : new Error('missing'),
  }))
  const createSignedUrl = vi.fn(async (_path: string, expiresIn: number) => ({ data: { signedUrl: `https://signed.test/${expiresIn}` }, error: null }))
  return {
    client: { storage: { from: vi.fn(() => ({ upload, download, createSignedUrl })) } },
    upload, download, createSignedUrl,
  }
}

describe('supabase signed document storage', () => {
  it('uploads privately without overwrite', async () => {
    const { client, upload } = fakeClient()
    const storage = createSupabaseSignedDocumentStorage(client as never)
    const bytes = new Uint8Array([37, 80, 68, 70])
    await storage.put(path, bytes, { contentType: 'application/pdf' })
    expect(upload).toHaveBeenCalledWith(path, bytes, expect.objectContaining({ contentType: 'application/pdf', upsert: false }))
  })

  it('accepts an existing object only when bytes are identical', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const { client, download } = fakeClient({ uploadError: { statusCode: '409', message: 'Duplicate' }, existing: bytes })
    const storage = createSupabaseSignedDocumentStorage(client as never)
    await expect(storage.put(path, bytes, { contentType: 'application/pdf' })).resolves.toBeUndefined()
    expect(download).toHaveBeenCalledWith(path)
  })

  it('fails closed when an existing object differs', async () => {
    const { client } = fakeClient({ uploadError: { statusCode: '409', message: 'Duplicate' }, existing: new Uint8Array([9, 9, 9]) })
    const storage = createSupabaseSignedDocumentStorage(client as never)
    await expect(storage.put(path, new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' }))
      .rejects.toThrow('DOCUMENT_STORAGE_CONFLICT')
  })

  it('creates download URLs with a five minute maximum', async () => {
    const { client, createSignedUrl } = fakeClient()
    const storage = createSupabaseSignedDocumentStorage(client as never)
    await expect(storage.createShortLivedDownloadUrl(path)).resolves.toBe('https://signed.test/300')
    expect(createSignedUrl).toHaveBeenCalledWith(path, 300)
  })
})
