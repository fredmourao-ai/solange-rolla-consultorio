import { describe, expect, it } from 'vitest'
import { saveDraft } from './save-draft'

describe('save sensitive form draft', () => {
  const template = {
    id: '00000000-0000-0000-0000-000000000002',
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

  it('allows an incomplete draft so the patient can save and continue', async () => {
    const persisted = await saveDraft({
      submissionId: '00000000-0000-0000-0000-000000000001',
      templateVersionId: '00000000-0000-0000-0000-000000000002',
      classification: 'sensitive',
      answers: {},
      template,
    }, {
      repository: { save: async (draft) => draft },
      crypto: { encrypt: async () => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: 'cipher', authTag: 'tag' }), decrypt: async () => '' },
    })
    expect(persisted).toMatchObject({ status: 'draft', answersCiphertext: 'cipher' })
  })

  it('still rejects invalid types in a partial draft', async () => {
    await expect(saveDraft({
      submissionId: '00000000-0000-0000-0000-000000000001',
      templateVersionId: '00000000-0000-0000-0000-000000000002',
      classification: 'sensitive', answers: { notes: false }, template,
    }, { repository: { save: async () => ({}) }, crypto: { encrypt: async () => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: 'cipher', authTag: 'tag' }), decrypt: async () => '' } }))
      .rejects.toThrow('invalid form answers')
  })

  it('rejects a patient draft without a bound public action context', async () => {
    await expect(saveDraft({
      submissionId: '00000000-0000-0000-0000-000000000001',
      templateVersionId: '00000000-0000-0000-0000-000000000002',
      classification: 'sensitive',
      source: 'patient_capability',
      answers: { notes: 'sentinel' },
      template,
    }, {
      repository: { save: async () => ({}) },
      crypto: { encrypt: async () => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: 'cipher', authTag: 'tag' }), decrypt: async () => '' },
    })).rejects.toThrow('PUBLIC_ACTION_CONTEXT_REQUIRED')
  })
})


describe('form template binding', () => {
  it('rejects saving a draft against a different template version', async () => {
    const template = {
      id: 'template-v1', version: 1, classification: 'sensitive' as const,
      fields: [{ key: 'notes', type: 'long_text' as const, required: true, label: 'Notes' }],
    }
    await expect(saveDraft({
      submissionId: 'sub-1', templateVersionId: 'template-v2',
      classification: 'sensitive', answers: { notes: 'x' }, template,
    }, {
      repository: { save: async (input) => input },
      crypto: {
        encrypt: async () => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: 'cipher', authTag: 'tag' }),
        decrypt: async () => '',
      },
    })).rejects.toThrow('FORM_TEMPLATE_VERSION_MISMATCH')
  })
})


describe('form classification binding', () => {
  it('never lets a sensitive template be persisted as administrative plaintext', async () => {
    const template = {
      id: 'template-v1', version: 1, classification: 'sensitive' as const,
      fields: [{ key: 'notes', type: 'long_text' as const, required: true, label: 'Notes' }],
    }
    await expect(saveDraft({
      submissionId: 'sub-1', templateVersionId: template.id,
      classification: 'administrative', answers: { notes: 'FORM_SENSITIVE_SENTINEL' }, template,
    }, {
      repository: { save: async (input) => input },
      crypto: {
        encrypt: async () => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: 'cipher', authTag: 'tag' }),
        decrypt: async () => '',
      },
    })).rejects.toThrow('FORM_CLASSIFICATION_MISMATCH')
  })
})
