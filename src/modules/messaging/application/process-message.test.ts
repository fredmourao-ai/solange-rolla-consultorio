import { describe, expect, it } from 'vitest'
import { processMessage } from './process-message'

describe('message worker', () => {
  const message = { channel: 'email' as const, recipient: 'x@example.test', body: 'Administrativo', idempotencyKey: 'appointment:1' }
  it('retries transient provider failures with the same key', async () => {
    const requeues: Array<[string, number]> = []
    const result = await processMessage({ messageId: 'm1', attemptNumber: 1, message }, {
      provider: { send: async () => { throw new Error('provider 503') } },
      attempts: { appendAttempt: async () => {}, markSent: async () => {}, markFailed: async () => {} },
      retryQueue: { requeue: async (...args) => { requeues.push(args) } },
    })
    expect(result).toBe('retry')
    expect(requeues).toEqual([['appointment:1', 2]])
  })
  it('does not retry permanent failures after the lease budget', async () => {
    let failed = false
    const result = await processMessage({ messageId: 'm1', attemptNumber: 5, message }, {
      provider: { send: async () => { throw new Error('400 invalid recipient') } },
      attempts: { appendAttempt: async () => {}, markSent: async () => {}, markFailed: async () => { failed = true } },
      retryQueue: { requeue: async () => { throw new Error('must not requeue') } },
    })
    expect(result).toBe('failed')
    expect(failed).toBe(true)
  })
})
