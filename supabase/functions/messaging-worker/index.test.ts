import { describe, expect, it } from 'vitest'
import { drainMessagingQueue } from './index'

const message = {
  kind: 'messaging.deliver' as const,
  idempotencyKey: 'logical-1',
  correlationId: 'corr-1',
  payload: { messageId: 'm1' },
}

describe('drainMessagingQueue', () => {
  it('archives a successfully processed job', async () => {
    const archived: string[] = []
    const count = await drainMessagingQueue({
      read: async () => [{ id: 'job-1', readCount: 1, message }],
      archive: async (id) => { archived.push(id); return true },
      requeue: async () => true,
      process: async () => 'sent',
    })
    expect(count).toBe(1)
    expect(archived).toEqual(['job-1'])
  })

  it('requeues the same physical job on transient retry', async () => {
    const requeues: Array<[string, number]> = []
    const archived: string[] = []
    await drainMessagingQueue({
      read: async () => [{ id: 'job-7', readCount: 2, message }],
      archive: async (id) => { archived.push(id); return true },
      requeue: async (id, delay) => { requeues.push([id, delay]); return true },
      process: async (_messageId, attempt, retry) => {
        expect(attempt).toBe(2)
        await retry(4)
        return 'retry'
      },
    })
    expect(requeues).toEqual([['job-7', 4]])
    expect(archived).toEqual([])
  })
})
