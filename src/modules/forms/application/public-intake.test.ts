import { describe, expect, it } from 'vitest'
import { loadPublicIntake } from './public-intake'
import type { CapabilitySessionRecord } from '../../../platform/capabilities/session'

const session: CapabilitySessionRecord = {
  id: 'cap-1', purpose: 'form_fill', subjectType: 'form_submission', subjectId: 'sub-1',
  expiresAt: '2026-08-29T12:00:00.000Z', usedAt: '2026-08-29T00:00:00.000Z', revokedAt: null,
}

const template = {
  id: 'tpl-v1', version: 1, classification: 'sensitive' as const,
  fields: [{ key: 'notes', type: 'long_text' as const, required: true, label: 'Conte um pouco sobre você' }],
}

function tokenIssuer(input: { purpose: string; subjectId: string }) {
  return { token: `${input.purpose}:${input.subjectId}`, expiresAt: '2026-08-29T00:05:00.000Z' }
}
describe('public intake orchestration', () => {
  it('prepares an empty first visit with separate save and submit action tokens', async () => {
    const repository = {
      loadBound: async () => ({
        id: 'sub-1', subjectId: 'person-1', status: 'draft' as const, template, currentVersionId: undefined,
        stored: { id: 'sub-1', templateVersionId: template.id, classification: 'sensitive' as const, status: 'draft' as const },
      }),
      findCurrent: async () => null,
    }
    const intake = await loadPublicIntake(session, {
      repository,
      crypto: { encrypt: async () => { throw new Error('unused') }, decrypt: async () => { throw new Error('unused') } },
      issueActionToken: tokenIssuer,
    })

    expect(intake.answers).toEqual({})
    expect(intake.subjectId).toBe('person-1')
    expect(intake.actionTokens.save!.token).toBe('public_form_save:sub-1')
    expect(intake.actionTokens.submit!.token).toBe('public_form_submit:sub-1')
    expect(intake.actionTokens.sign).toBeUndefined()
  })
  it('decrypts a sensitive current version only in memory and prepares signing when submitted', async () => {
    const stored = {
      id: 'sub-1', templateVersionId: template.id, classification: 'sensitive' as const, status: 'submitted' as const,
      answersCiphertext: 'cipher', answersIv: 'iv', answersAuthTag: 'tag', keyVersion: 1,
    }
    const repository = {
      loadBound: async () => ({ id: 'sub-1', subjectId: 'person-1', status: 'submitted' as const, template, currentVersionId: 'version-1', stored }),
      findCurrent: async () => stored,
    }
    const intake = await loadPublicIntake(session, {
      repository,
      crypto: { encrypt: async () => { throw new Error('unused') }, decrypt: async () => JSON.stringify({ notes: 'Resposta privada' }) },
      issueActionToken: tokenIssuer,
    })

    expect(intake.answers).toEqual({ notes: 'Resposta privada' })
    expect(JSON.stringify(intake)).not.toContain('cipher')
    expect(intake.currentVersionId).toBe('version-1')
    expect(intake.actionTokens.sign?.token).toBe('sign_submission:version-1')
  })
})
