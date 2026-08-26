import { describe, expect, it, vi } from 'vitest'
import { createPrivateStorage, buildPrivateObjectPath } from './private-storage'

describe('private storage', () => {
  it('creates opaque paths without personal data', () => {
    expect(
      buildPrivateObjectPath({
        entity: 'form',
        entityId: '00000000-0000-0000-0000-000000000001',
        objectId: '00000000-0000-0000-0000-000000000002',
        extension: 'pdf',
      }),
    ).toBe('form/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.pdf')
  })

  it('rejects paths containing personal identifiers or unsafe segments', () => {
    const storage = createPrivateStorage({
      bucket: 'clinical-private',
      backend: { upload: vi.fn(), createSignedUrl: vi.fn() },
    })

    expect(() => storage.validatePath('123.456.789-09/prontuario.pdf')).toThrow('OPAQUE_STORAGE_PATH')
    expect(() => storage.validatePath('Maria Silva/diagnostico.pdf')).toThrow('OPAQUE_STORAGE_PATH')
  })

  it('caps signed URL TTL at ten minutes', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/1' }, error: null })
    const storage = createPrivateStorage({
      bucket: 'signed-documents-private',
      ttlSeconds: 900,
      backend: { upload: vi.fn(), createSignedUrl },
    })

    await expect(storage.createShortLivedDownloadUrl('form/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.pdf')).resolves.toBe('https://signed.test/1')
    expect(createSignedUrl).toHaveBeenCalledWith(
      'form/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002.pdf',
      600,
    )
  })
})
