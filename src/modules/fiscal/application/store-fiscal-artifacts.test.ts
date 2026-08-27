import { describe, expect, it } from 'vitest'
import { storeFiscalArtifact, type FiscalArtifactStorage } from './store-fiscal-artifacts'

describe('storeFiscalArtifact', () => {
  it('stores an opaque private path and integrity hash without personal data', async () => {
    const uploads: Array<{ path: string; contentType: string; bytes: Uint8Array }> = []
    const storage: FiscalArtifactStorage = {
      upload: async (path, bytes, contentType) => { uploads.push({ path, bytes, contentType }) },
    }

    const result = await storeFiscalArtifact({
      documentId: 'document-123',
      mediaType: 'application/pdf',
      bytes: new TextEncoder().encode('synthetic fiscal artifact'),
    }, storage)

    expect(result).toMatchObject({
      path: 'fiscal/document-123/document.pdf',
      mediaType: 'application/pdf',
      byteLength: 25,
    })
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.path).not.toMatch(/cpf|nome|123456789/)
    expect(uploads).toHaveLength(1)
  })
})
