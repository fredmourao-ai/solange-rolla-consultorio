import { describe, expect, it } from 'vitest'
import { issuePublicActionToken } from '../../../platform/security/action-token'
import { createInMemoryRateLimitStore, createPrivacySafeRateLimiter } from '../../../platform/security/rate-limit'
import { savePublicIntakeDraft, savePublicIntakeForReview, submitPublicIntake, submitReviewedPublicIntake } from './public-intake-actions'
import type { StoredFormSubmission } from './read-submission'

const secret = 's'.repeat(32)
const session = {
  id: 'cap-1', purpose: 'form_fill', subjectType: 'form_submission' as const, subjectId: 'sub-1',
  expiresAt: '2026-08-29T12:00:00.000Z', usedAt: '2026-08-29T00:00:00.000Z', revokedAt: null,
}
const template = {
  id: 'tpl-v1', version: 1, classification: 'sensitive' as const,
  fields: [{ key: 'name', type: 'short_text' as const, required: true, label: 'Nome' }],
}

function dependencies(writes: Record<string, unknown>[]) {
  const nonces = new Set<string>()
  const repository = {
    loadBound: async () => ({ id: 'sub-1', subjectId: 'person-1', status: 'draft' as const, template,
      stored: { id: 'sub-1', templateVersionId: 'tpl-v1', classification: 'sensitive' as const, status: 'draft' as const } }),
    findCurrent: async () => null as StoredFormSubmission | null,
    save: async (value: Record<string, unknown>) => { writes.push(value); return value },
    submit: async (value: Record<string, unknown>) => { writes.push(value); return { ...value, submissionVersionId: 'version-1' } },
  }
  return {
    repository,
    crypto: {
      encrypt: async (plaintext: string) => ({ alg: 'A256GCM' as const, keyVersion: 1, iv: 'iv', ciphertext: Buffer.from(plaintext).toString('base64'), authTag: 'tag' }),
      decrypt: async () => '{}',
    },
    allowedOrigins: ['https://app.test'],
    actionSecret: secret,
    nonceStore: {
      async consumeOnce(nonce: string) {
        if (nonces.has(nonce)) return false
        nonces.add(nonce)
        return true
      },
    },
    rateLimiter: createPrivacySafeRateLimiter({ secret: 'r'.repeat(32), store: createInMemoryRateLimitStore() }),
  }
}

function actionToken(purpose: string) {
  return issuePublicActionToken({ capabilitySessionId: session.id, purpose, subjectId: session.subjectId, secret }).token
}

function formData() {
  const data = new FormData()
  data.set('name', 'Pessoa Sintética')
  return data
}
describe('public intake mutations', () => {
  it('saves a same-origin draft through the encrypted use-case', async () => {
    const writes: Record<string, unknown>[] = []
    const result = await savePublicIntakeDraft({
      session,
      request: new Request('https://app.test/formulario', { method: 'POST', headers: { origin: 'https://app.test' } }),
      actionToken: actionToken('public_form_save'),
      formData: formData(),
    }, dependencies(writes))

    expect(result).toMatchObject({ status: 'draft' })
    expect(writes).toHaveLength(1)
    expect(writes[0]).not.toHaveProperty('answers')
    expect(JSON.stringify(writes)).not.toContain('Pessoa Sintética')
  })

  it('rejects cross-origin mutation before any write', async () => {
    const writes: Record<string, unknown>[] = []
    await expect(savePublicIntakeDraft({
      session,
      request: new Request('https://app.test/formulario', { method: 'POST', headers: { origin: 'https://evil.test' } }),
      actionToken: actionToken('public_form_save'),
      formData: formData(),
    }, dependencies(writes))).rejects.toThrow('TRUSTED_ORIGIN_REQUIRED')
    expect(writes).toHaveLength(0)
  })
  it('submits the complete form with a purpose-bound one-time token', async () => {
    const writes: Record<string, unknown>[] = []
    const result = await submitPublicIntake({
      session,
      request: new Request('https://app.test/formulario', { method: 'POST', headers: { origin: 'https://app.test' } }),
      actionToken: actionToken('public_form_submit'),
      formData: formData(),
    }, dependencies(writes))

    expect(result).toMatchObject({ status: 'submitted', submissionVersionId: 'version-1' })
    expect(writes).toHaveLength(1)
  })

  it('requires all mandatory answers before entering review', async () => {
    const writes: Record<string, unknown>[] = []
    await expect(savePublicIntakeForReview({
      session,
      request: new Request('https://app.test/formulario', { method: 'POST', headers: { origin: 'https://app.test' } }),
      actionToken: actionToken('public_form_save'),
      formData: new FormData(),
    }, dependencies(writes))).rejects.toThrow('invalid form answers')
    expect(writes).toHaveLength(0)
  })

  it('submits exactly the reviewed encrypted draft without accepting browser answers again', async () => {
    const writes: Record<string, unknown>[] = []
    const deps = dependencies(writes)
    const stored = { id: 'sub-1', templateVersionId: 'tpl-v1', classification: 'sensitive' as const, status: 'draft' as const,
      answersCiphertext: 'cipher', answersIv: 'iv', answersAuthTag: 'tag', keyVersion: 1 }
    deps.repository.loadBound = async () => ({ id: 'sub-1', subjectId: 'person-1', status: 'draft' as const, template, currentVersionId: 'version-1', stored })
    deps.repository.findCurrent = async () => stored
    deps.crypto.decrypt = async () => JSON.stringify({ name: 'Pessoa Sintética' })

    const result = await submitReviewedPublicIntake({
      session,
      request: new Request('https://app.test/formulario/revisao', { method: 'POST', headers: { origin: 'https://app.test' } }),
      actionToken: actionToken('public_form_submit'),
    }, deps)
    expect(result).toMatchObject({ status: 'submitted', submissionVersionId: 'version-1' })
    expect(writes).toHaveLength(1)
  })
})
