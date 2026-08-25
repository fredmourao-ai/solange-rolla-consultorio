import { describe, expect, it } from 'vitest'
import { createSupabaseQueueBackend } from './supabase-queue'
import type { QueueMessage } from './types'

describe('Supabase queue backend', () => {
  it('uses only the narrow server-side queue RPCs', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const message: QueueMessage<{ id: string }> = {
      kind: 'documents.render',
      idempotencyKey: 'doc:123',
      correlationId: 'request:456',
      payload: { id: '123' },
      createdAt: '2026-08-24T12:00:00.000Z',
    }

    const backend = createSupabaseQueueBackend({
      rpc: async (name, args) => {
        calls.push({ name, args })

        if (name === 'queue_send') return { data: '42', error: null }
        if (name === 'queue_read') {
          return {
            data: [
              {
                id: '42',
                read_count: 2,
                enqueued_at: '2026-08-24T12:00:00.000Z',
                visible_at: '2026-08-24T12:01:00.000Z',
                message,
              },
            ],
            error: null,
          }
        }
        return { data: true, error: null }
      },
    })

    expect(await backend.send('documents', message, { delaySeconds: 5 })).toBe('42')
    expect(await backend.read('documents', { visibilityTimeoutSeconds: 30, batchSize: 1 })).toEqual([
      {
        id: '42',
        readCount: 2,
        enqueuedAt: '2026-08-24T12:00:00.000Z',
        visibleAt: '2026-08-24T12:01:00.000Z',
        message,
      },
    ])
    expect(await backend.archive('documents', '42')).toBe(true)
    expect(await backend.requeue('documents', '42', 0)).toBe(true)

    expect(calls.map(({ name }) => name)).toEqual([
      'queue_send',
      'queue_read',
      'queue_archive',
      'queue_requeue',
    ])
  })

  it('fails closed when a queue RPC returns an error', async () => {
    const backend = createSupabaseQueueBackend({
      rpc: async () => ({ data: null, error: { message: 'database unavailable' } }),
    })

    await expect(
      backend.archive('documents', '42'),
    ).rejects.toThrow('database unavailable')
  })
})
