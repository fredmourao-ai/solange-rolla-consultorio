import { describe, expect, it } from 'vitest'
import type { EncryptedEnvelope, SensitiveDataCrypto } from '../../../platform/crypto/types'
import { getClinicalRecord } from './get-clinical-record'

describe('getClinicalRecord', () => {
  it('decrypts only after receiving the authorized envelope', async () => {
    const plaintext = 'synthetic clinical note'
    const envelope: EncryptedEnvelope = {
      alg: 'A256GCM',
      keyVersion: 1,
      iv: 'synthetic-iv',
      ciphertext: 'synthetic-ciphertext',
      authTag: 'synthetic-auth-tag',
    }
    const crypto: SensitiveDataCrypto = {
      encrypt: async () => envelope,
      decrypt: async (received, context) => {
        expect(received).toEqual(envelope)
        expect(context).toEqual({ entity: 'clinical-record', id: 'record-1' })
        return plaintext
      },
    }

    await expect(getClinicalRecord('record-1', {
      crypto,
      reader: {
        getEnvelope: async () => ({
          id: 'record-1',
          appointmentId: 'appointment-1',
          personId: 'person-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          envelope,
        }),
      },
    })).resolves.toMatchObject({ id: 'record-1', plaintext })
  })

  it('surfaces tampering as an integrity error instead of empty plaintext', async () => {
    const envelope: EncryptedEnvelope = {
      alg: 'A256GCM',
      keyVersion: 1,
      iv: 'synthetic-iv',
      ciphertext: 'synthetic-ciphertext',
      authTag: 'synthetic-auth-tag',
    }

    await expect(getClinicalRecord('record-1', {
      crypto: {
        encrypt: async () => { throw new Error('unused') },
        decrypt: async () => { throw new Error('AUTH_TAG_INVALID') },
      },
      reader: {
        getEnvelope: async () => ({
          id: 'record-1',
          appointmentId: 'appointment-1',
          personId: 'person-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          envelope,
        }),
      },
    })).rejects.toThrow('CLINICAL_RECORD_INTEGRITY_ERROR')
  })
})
