import { describe, expect, it } from 'vitest'
import { issuePublicActionToken } from '../../../platform/security/action-token'
import { respondToPublicConfirmation } from './public-confirmation'

const secret = 'x'.repeat(32)
const session = { id: 'cap-1', purpose: 'appointment_response', subjectType: 'appointment' as const, subjectId: 'a1', expiresAt: '2030-01-01T00:00:00Z', usedAt: '2026-08-29T00:00:00Z', revokedAt: null }

function request() { return new Request('https://app.test/api/public/consulta/respond', { method: 'POST', headers: { Origin: 'https://app.test' } }) }
function token() { return issuePublicActionToken({ capabilitySessionId: session.id, purpose: 'appointment_response', subjectId: 'a1', secret }).token }

function dependencies() {
  const updated: string[] = []
  return { updated, deps: {
    repository: { getResponseState: async () => ({ status: 'pending_confirmation', cancellationDeadlineAt: '2030-01-01T00:00:00Z' }), updateStatus: async (_id:string,status:string)=>{updated.push(status);return{status}}, createRescheduleTask: async()=> 'a1' },
    allowedOrigins: ['https://app.test'], actionSecret: secret,
    nonceStore: { consumeOnce: async () => true },
    rateLimiter: { consume: async () => ({ allowed: true, remaining: 5, retryAfterSeconds: 0 }) },
  }}
}
describe('public appointment confirmation', () => {
  it('confirms only through the bound capability and action token', async () => {
    const state = dependencies()
    const result = await respondToPublicConfirmation({ session, request: request(), actionToken: token(), action: 'confirm' }, state.deps)
    expect(result.status).toBe('confirmed')
    expect(state.updated).toEqual(['confirmed'])
  })

  it('rejects the wrong capability scope', async () => {
    const state = dependencies()
    await expect(respondToPublicConfirmation({ session: { ...session, purpose: 'form_fill' }, request: request(), actionToken: token(), action: 'confirm' }, state.deps)).rejects.toThrow('CAPABILITY_SCOPE_INVALID')
    expect(state.updated).toEqual([])
  })
})
