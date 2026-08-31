import { describe, expect, it } from 'vitest'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import type { PublicActionContext } from '../../../platform/security/public-action'
import type { FormTemplateVersion } from '../domain/form-schema'
import { startSubmission } from './start-submission'
import { readSubmission } from './read-submission'
import { submitForm } from './submit-form'

const templateV1: FormTemplateVersion = {
  id: '00000000-0000-0000-0000-000000000101',
  version: 1,
  classification: 'sensitive',
  fields: [{ key: 'notes', type: 'long_text', required: true, label: 'Observacoes' }],
}

const crypto: SensitiveDataCrypto = {
  encrypt: async (plaintext) => ({
    alg: 'A256GCM', keyVersion: 2, iv: 'iv',
    ciphertext: Buffer.from(plaintext).toString('base64'), authTag: 'tag',
  }),
  decrypt: async (envelope) => Buffer.from(envelope.ciphertext, 'base64').toString('utf8'),
}

function publicContext(purpose: string, subjectId: string): PublicActionContext {
  return { origin: 'https://example.test', capabilitySessionId: 'session', purpose, subjectId }
}

describe('form submission lifecycle', () => {
  it('starts a draft bound to the exact template version', async () => {
    const created: Array<Record<string, unknown>> = []
    const result = await startSubmission({
      id: 'sub-1', subjectId: 'person-1', template: templateV1,
    }, {
      create: async (input) => { created.push(input); return input },
    })

    expect(result).toMatchObject({
      id: 'sub-1', subjectId: 'person-1',
      templateVersionId: templateV1.id, templateVersion: 1,
      classification: 'sensitive', status: 'draft',
    })
    expect(created).toHaveLength(1)
  })

  it('decrypts sensitive answers only for the bound public subject', async () => {
    const stored = {
      id: 'sub-1', templateVersionId: templateV1.id,
      classification: 'sensitive' as const, status: 'draft' as const,
      answersCiphertext: Buffer.from(JSON.stringify({ notes: 'segredo' })).toString('base64'),
      answersIv: 'iv', answersAuthTag: 'tag', keyVersion: 2,
    }
    const result = await readSubmission({
      submissionId: 'sub-1', source: 'patient_capability',
      publicActionContext: publicContext('public_form_read', 'sub-1'),
    }, { repository: { findCurrent: async () => stored }, crypto })

    expect(result.answers).toEqual({ notes: 'segredo' })
    await expect(readSubmission({
      submissionId: 'sub-1', source: 'patient_capability',
      publicActionContext: publicContext('public_form_read', 'sub-2'),
    }, { repository: { findCurrent: async () => stored }, crypto }))
      .rejects.toThrow('PUBLIC_ACTION_CONTEXT_REQUIRED')
  })

  it('submits sensitive answers without persisting plaintext', async () => {
    let persisted: Record<string, unknown> | undefined
    const result = await submitForm({
      submissionId: 'sub-1', templateVersionId: templateV1.id,
      template: templateV1, answers: { notes: 'FORM_SENSITIVE_SENTINEL' },
      source: 'patient_capability',
      publicActionContext: publicContext('public_form_submit', 'sub-1'),
    }, {
      crypto,
      repository: { submit: async (input) => { persisted = input; return input } },
    })
    expect(result).toMatchObject({ status: 'submitted' })
    expect(persisted).toBeDefined()
    expect(persisted).not.toHaveProperty('answers')
    expect(JSON.stringify(persisted)).not.toContain('FORM_SENSITIVE_SENTINEL')
    expect(persisted).toMatchObject({
      submissionId: 'sub-1', templateVersionId: templateV1.id,
      answersCiphertext: expect.any(String), answersIv: 'iv',
      answersAuthTag: 'tag', keyVersion: 2, status: 'submitted',
    })
  })

  it('rejects switching a submission to another template version', async () => {
    const templateV2: FormTemplateVersion = { ...templateV1, id: 'template-v2', version: 2 }
    await expect(submitForm({
      submissionId: 'sub-1', templateVersionId: templateV1.id,
      template: templateV2, answers: { notes: 'x' },
    }, {
      crypto,
      repository: { submit: async (input) => input },
    })).rejects.toThrow('FORM_TEMPLATE_VERSION_MISMATCH')
  })
})
