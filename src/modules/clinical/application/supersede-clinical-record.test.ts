import { describe, expect, it } from 'vitest'
import type { EncryptedEnvelope, SensitiveDataCrypto } from '../../../platform/crypto/types'
import { supersedeClinicalRecord } from './supersede-clinical-record'
import type { ClinicalRecord } from '../domain/clinical-record'

describe('supersedeClinicalRecord', () => {
  it('creates a new encrypted version and preserves the original id', async () => {
    const original: ClinicalRecord = {
      id: 'record-1',
      appointmentId: 'appointment-1',
      personId: 'person-1',
      authorUserId: 'owner-1',
      ciphertext: 'original-ciphertext',
      iv: 'original-iv',
      authTag: 'original-tag',
      keyVersion: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const envelope: EncryptedEnvelope = {
      alg: 'A256GCM',
      keyVersion: 1,
      iv: 'replacement-iv',
      ciphertext: 'replacement-ciphertext',
      authTag: 'replacement-tag',
    }
    const crypto: SensitiveDataCrypto = {
      encrypt: async () => envelope,
      decrypt: async () => 'unused',
    }
    let inserted: ClinicalRecord | undefined

    const result = await supersedeClinicalRecord(original, {
      plaintext: 'synthetic corrected note',
      authorUserId: 'owner-1',
    }, {
      crypto,
      idFactory: () => 'record-2',
      repository: {
        insert: async (record) => {
          inserted = { ...record, createdAt: '2026-01-02T00:00:00.000Z' }
          return { ...record, createdAt: '2026-01-02T00:00:00.000Z' }
        },
      },
    })

    expect(result.id).toBe('record-2')
    expect(result.supersedesId).toBe('record-1')
    expect(inserted?.id).not.toBe(original.id)
    expect(original.ciphertext).toBe('original-ciphertext')
  })
})
