import { describe, expect, it, vi } from 'vitest'
import { drainMessagingQueueOnce, processMessagingJob, runMessagingWorker } from './messaging-worker-runtime'

const queueJob = {
  id: 'queue-1', readCount: 1, enqueuedAt: '2026-09-01T00:00:00.000Z', visibleAt: '2026-09-01T00:00:00.000Z',
  message: {
    kind: 'messaging.deliver', idempotencyKey: 'appointment:1:confirmation:v1', correlationId: 'corr-1',
    createdAt: '2026-09-01T00:00:00.000Z', payload: { messageId: '11111111-1111-4111-8111-111111111111' },
  },
}

describe('messaging worker runtime', () => {
  it('archives a successfully sent queue job', async () => {
    const queue = { read: vi.fn(async () => [queueJob]), archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn() }
    const process = vi.fn(async () => 'sent' as const)
    await expect(drainMessagingQueueOnce({ queue, process })).resolves.toBe(1)
    expect(queue.archive).toHaveBeenCalledWith('queue-1')
    expect(queue.requeue).not.toHaveBeenCalled()
  })

  it('requeues a retryable job using the process callback and does not archive', async () => {
    const queue = { read: vi.fn(async () => [queueJob]), archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn() }
    const process = vi.fn(async (_id: string, _attempt: number, retry: (delay: number) => Promise<void>) => { await retry(4); return 'retry' as const })
    await drainMessagingQueueOnce({ queue, process })
    expect(queue.requeue).toHaveBeenCalledWith('queue-1', 4)
    expect(queue.archive).not.toHaveBeenCalled()
  })

  it('throws if a job claims retry without actually requeuing (would silently drop the job)', async () => {
    const queue = { read: vi.fn(async () => [queueJob]), archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn() }
    const process = vi.fn(async () => 'retry' as const)
    await expect(drainMessagingQueueOnce({ queue, process })).rejects.toThrow('MESSAGING_RETRY_NOT_REQUEUED')
  })

  it('archives malformed messages without invoking process', async () => {
    const queue = {
      read: vi.fn(async () => [{ ...queueJob, message: { ...queueJob.message, payload: { messageId: 'x', extra: 'y' } } }]),
      archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn(),
    }
    const process = vi.fn()
    await drainMessagingQueueOnce({ queue: queue as never, process })
    expect(process).not.toHaveBeenCalled()
    expect(queue.archive).toHaveBeenCalledWith('queue-1')
  })

  it('retries a transient send failure (e.g. WhatsApp 429) with backoff, and stops at the attempt ceiling', async () => {
    const retry = vi.fn(async () => undefined)
    const failing = { send: vi.fn(async () => { throw new Error('WHATSAPP_TRANSIENT', { cause: 'rate limited' }) }) }
    await expect(processMessagingJob('m1', 1, retry, failing)).resolves.toBe('retry')
    expect(retry).toHaveBeenCalledWith(2)
    await expect(processMessagingJob('m1', 5, retry, failing)).resolves.toBe('failed')
  })

  it('fails immediately (no retry) on a permanent rejection like an unapproved template', async () => {
    const retry = vi.fn(async () => undefined)
    const failing = { send: vi.fn(async () => { throw new Error('WHATSAPP_REJECTED', { cause: 're-engagement' }) }) }
    await expect(processMessagingJob('m1', 1, retry, failing)).resolves.toBe('failed')
    expect(retry).not.toHaveBeenCalled()
  })

  it('stops the polling loop cleanly when aborted', async () => {
    const controller = new AbortController()
    const drain = vi.fn(async () => { controller.abort(); return 0 })
    const wait = vi.fn(async () => undefined)
    await runMessagingWorker({ signal: controller.signal, drain, wait, pollMs: 250 })
    expect(drain).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })
})
