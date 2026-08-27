import { describe, expect, it } from 'vitest'
import { consumePublicActionToken, issuePublicActionToken } from './action-token'

describe('public action tokens', () => {
  it('binds a short-lived token to session, subject and purpose', async () => {
    const issued = issuePublicActionToken({
      secret: 'test-secret-with-enough-entropy',
      capabilitySessionId: 'session-1',
      purpose: 'sign_submission',
      subjectId: 'subject-1',
      now: new Date('2026-08-27T12:00:00Z'),
      ttlSeconds: 60,
    })
    const store = { consumed: new Set<string>(), async consumeOnce(nonce: string) { if (this.consumed.has(nonce)) return false; this.consumed.add(nonce); return true } }

    await expect(consumePublicActionToken(issued.token, {
      secret: 'test-secret-with-enough-entropy', capabilitySessionId: 'session-1', purpose: 'sign_submission', subjectId: 'subject-1',
      now: new Date('2026-08-27T12:00:30Z'), store,
    })).resolves.toMatchObject({ subjectId: 'subject-1', purpose: 'sign_submission' })
    await expect(consumePublicActionToken(issued.token, {
      secret: 'test-secret-with-enough-entropy', capabilitySessionId: 'session-1', purpose: 'sign_submission', subjectId: 'subject-1',
      now: new Date('2026-08-27T12:00:31Z'), store,
    })).rejects.toThrow('ACTION_TOKEN_REPLAYED')
    await expect(consumePublicActionToken(issued.token, {
      secret: 'test-secret-with-enough-entropy', capabilitySessionId: 'session-1', purpose: 'cancel_appointment', subjectId: 'subject-1',
      now: new Date('2026-08-27T12:00:31Z'), store,
    })).rejects.toThrow('ACTION_TOKEN_INVALID')
  })
})
