import { describe, expect, it } from 'vitest'
import { createQueue } from './queue'
import type { QueueBackend, QueueJob } from './types'

const fixedNow = new Date('2026-08-24T12:00:00.000Z')

describe('QueuePort contract', () => {
  it('preserves the application idempotency key in queued jobs', async () => {
    let storedMessage: unknown

    const backend: QueueBackend = {
      async send(_queueName, message) {
        storedMessage = message
        return '42'
      },
      async read() {
        return [
          {
            id: '42',
            readCount: 1,
            enqueuedAt: fixedNow.toISOString(),
            visibleAt: fixedNow.toISOString(),
            message: storedMessage,
          } as QueueJob<unknown>,
        ]
      },
      async archive() {
        return true
      },
      async requeue() {
        return true
      },
    }

    const queue = createQueue({
      name: 'documents',
      backend,
      now: () => fixedNow,
    })

    const id = await queue.send({
      kind: 'documents.render',
      idempotencyKey: 'doc:123',
      correlationId: 'request:456',
      payload: { id: '123' },
    })
    const [job] = await queue.read({ batchSize: 1, visibilityTimeoutSeconds: 30 })

    expect(id).toBe('42')
    expect(job.id).toBe(id)
    expect(job.message.idempotencyKey).toBe('doc:123')
    expect(job.message.correlationId).toBe('request:456')
    expect(job.message.createdAt).toBe(fixedNow.toISOString())
  })
})
