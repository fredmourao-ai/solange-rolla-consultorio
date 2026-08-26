import { describe, expect, it } from 'vitest'
import { enqueueMessage } from './enqueue-message'
import type { OutboundMessage } from '../domain/message'

describe('messaging outbox', () => {
  it('returns the existing logical message for the same idempotency key', async () => {
    const stored = new Map<string, OutboundMessage>()
    const repo = {
      findByIdempotencyKey: async (key: string) => stored.get(key) ?? null,
      insert: async (message: Omit<OutboundMessage, 'id' | 'status'>) => { const value: OutboundMessage = { id: 'message-1', status: 'queued', ...message }; stored.set(message.idempotencyKey, value); return value },
    }
    const input = { idempotencyKey: 'appointment:123:confirmation', channel: 'email' as const, recipient: 'x@example.test', templateKey: 'appointment_confirmation', payload: { preferredName: 'Paciente' } }
    const first = await enqueueMessage(input, repo)
    const second = await enqueueMessage(input, repo)
    expect(second.id).toBe(first.id)
  })

  it('rejects clinical content', async () => {
    await expect(enqueueMessage({ idempotencyKey: 'x', channel: 'email', recipient: 'x', templateKey: 'x', payload: { diagnosis: 'secret' } }, { findByIdempotencyKey: async () => null, insert: async () => { throw new Error('must not insert') } })).rejects.toThrow('CLINICAL_CONTENT_FORBIDDEN')
  })
})
