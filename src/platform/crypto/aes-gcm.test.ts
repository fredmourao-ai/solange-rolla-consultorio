import { describe, expect, it } from 'vitest'
import { createSensitiveDataCrypto } from './aes-gcm'

const key = Buffer.alloc(32, 7).toString('base64')

describe('sensitive data encryption', () => {
  it('encrypts with a fresh IV and decrypts with matching AAD', async () => {
    const crypto = createSensitiveDataCrypto({
      CLINICAL_ENCRYPTION_KEY_V1: key,
      CLINICAL_ENCRYPTION_ACTIVE_VERSION: '1',
    })

    const a = await crypto.encrypt('segredo', { entity: 'form', id: 'id-1' })
    const b = await crypto.encrypt('segredo', { entity: 'form', id: 'id-1' })

    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    await expect(crypto.decrypt(a, { entity: 'form', id: 'id-1' })).resolves.toBe('segredo')
  })

  it('rejects an envelope with the wrong AAD context', async () => {
    const crypto = createSensitiveDataCrypto({
      CLINICAL_ENCRYPTION_KEY_V1: key,
      CLINICAL_ENCRYPTION_ACTIVE_VERSION: '1',
    })
    const envelope = await crypto.encrypt('segredo', { entity: 'form', id: 'id-1' })

    await expect(crypto.decrypt(envelope, { entity: 'form', id: 'id-2' })).rejects.toThrow()
  })

  it('rejects missing or weak keys', () => {
    expect(() => createSensitiveDataCrypto({ CLINICAL_ENCRYPTION_KEY_V1: 'short', CLINICAL_ENCRYPTION_ACTIVE_VERSION: '1' })).toThrow()
  })
})
