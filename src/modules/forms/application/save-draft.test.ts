import { describe, expect, it } from 'vitest'
import { saveDraft } from './save-draft'

describe('save sensitive form draft', () => {
  const template = {
    id: 'template-version',
    version: 1,
    classification: 'sensitive' as const,
    fields: [{ key: 'notes', type: 'long_text' as const, required: true, label: 'Notes' }],
  }

  it('persists only an encrypted envelope for sensitive answers', async () => {
    const repository = {
      save: async (draft: Record<string, unknown>) => draft,
    }
    const crypto = {
      encrypt: async (plaintext: string) => ({
        alg: 'A256GCM' as const,
        keyVersion: 1,
        iv: 'iv',
        ciphertext: Buffer.from(plaintext).toString('base64'),
        authTag: 'tag',
      }),
      decrypt: async () => 'unused',
    }

    const persisted = await saveDraft({
      submissionId: '00000000-0000-0000-0000-000000000001',
      templateVersionId: '00000000-0000-0000-0000-000000000002',
      classification: 'sensitive',
      answers: { notes: 'FORM_SENSITIVE_SENTINEL' },
      template,
    }, { repository, crypto })

    expect(persisted).not.toHaveProperty('answers')
    expect(persisted).toMatchObject({
      answersCiphertext: expect.any(String),
      answersIv: 'iv',
      answersAuthTag: 'tag',
      keyVersion: 1,
    })
    expect(JSON.stringify(persisted)).not.toContain('FORM_SENSITIVE_SENTINEL')
  })

  it('rejects drafts that do not satisfy the versioned schema', async () => {
    await expect(saveDraft({
      submissionId: '00000000-0000-0000-0000-000000000001',
      templateVersionId: '00000000-0000-0000-0000-000000000002',
      classification: 'sensitive',
      answers: {},
      template,
    }, {
      repository: { save: async () => ({}) },
      crypto: { encrypt: async () => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: 'cipher', authTag: 'tag' }), decrypt: async () => '' },
    })).rejects.toThrow('invalid form answers')
  })
})
