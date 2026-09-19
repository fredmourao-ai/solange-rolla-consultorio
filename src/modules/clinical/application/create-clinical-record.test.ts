import { describe, expect, it } from 'vitest'
import type { EncryptedEnvelope, SensitiveDataCrypto } from '../../../platform/crypto/types'
import { createClinicalRecord } from './create-clinical-record'

describe('createClinicalRecord', () => {
  it('never sends plaintext to the atomic persistence repository', async () => {
    const plaintext = 'SENSITIVE_SENTINEL_DO_NOT_LOG'
    let lastInsert: Record<string, unknown> | undefined
    const envelope: EncryptedEnvelope = {
      alg: 'A256GCM',
      keyVersion: 1,
      iv: 'synthetic-iv',
      ciphertext: 'synthetic-ciphertext',
      authTag: 'synthetic-auth-tag',
    }
    const crypto: SensitiveDataCrypto = {
      encrypt: async (value, context) => {
        expect(value).toBe(plaintext)
        expect(context).toEqual({ entity: 'clinical-record', id: 'record-1' })
        return envelope
      },
      decrypt: async () => plaintext,
    }

    await createClinicalRecord({
      appointmentId: 'appointment-1',
      personId: 'person-1',
      authorUserId: 'owner-1',
      plaintext,
    }, {
      crypto,
      idFactory: () => 'record-1',
      repository: {
        insert: async (record) => {
          lastInsert = record
          return { ...record, createdAt: '2026-01-01T00:00:00.000Z' }
        },
      },
    })

    expect(JSON.stringify(lastInsert)).not.toContain(plaintext)
    expect(lastInsert).toMatchObject({
      id: 'record-1',
      appointmentId: 'appointment-1',
      personId: 'person-1',
      keyVersion: 1,
      ciphertext: envelope.ciphertext,
    })
  })
})
