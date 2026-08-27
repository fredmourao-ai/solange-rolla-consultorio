import { describe, expect, it } from 'vitest'
import { drainFiscalQueue } from '../../supabase/functions/fiscal-worker/index'

describe('fiscal worker queue', () => {
  it('archives successful jobs and requeues failed jobs', async () => {
    const archived: string[] = []
    const requeued: string[] = []
    const processed: string[] = []
    const result = await drainFiscalQueue({
      read: async () => [
        { id: 'job-1', message: { kind: 'fiscal.issue', idempotencyKey: 'one', correlationId: 'corr-one', payload: {} } },
        { id: 'job-2', message: { kind: 'fiscal.issue', idempotencyKey: 'two', correlationId: 'corr-two', payload: {} } },
      ],
      archive: async (id) => { archived.push(id); return true },
      requeue: async (id) => { requeued.push(id); return true },
      process: async (message) => {
        processed.push(message.idempotencyKey)
        if (message.idempotencyKey === 'two') throw new Error('temporary')
      },
    })

    expect(result).toBe(1)
    expect(processed).toEqual(['one', 'two'])
    expect(archived).toEqual(['job-1'])
    expect(requeued).toEqual(['job-2'])
  })
})
