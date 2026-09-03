import { describe, expect, it, vi } from 'vitest'
import { drainMessagingQueueOnce, runMessagingWorker } from './messaging-worker-runtime'

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
    expect(process).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', 1, expect.any(Function))
  })

  it('requeues a retryable job using the process callback and does not archive', async () => {
    const queue = { read: vi.fn(async () => [queueJob]), archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn() }
    const process = vi.fn(async (_id: string, _attempt: number, retry: (delay: number) => Promise<void>) => { await retry(4); return 'retry' as const })
    await drainMessagingQueueOnce({ queue, process })
    expect(queue.requeue).toHaveBeenCalledWith('queue-1', 4)
    expect(queue.archive).not.toHaveBeenCalled()
  })

  it('archives a permanently failed job (process already recorded/handled it)', async () => {
    const queue = { read: vi.fn(async () => [queueJob]), archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn() }
    await drainMessagingQueueOnce({ queue, process: vi.fn(async () => 'failed' as const) })
    expect(queue.archive).toHaveBeenCalledWith('queue-1')
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

  it('passes readCount through as the attempt number', async () => {
    const queue = { read: vi.fn(async () => [{ ...queueJob, readCount: 3 }]), archive: vi.fn(async () => true), requeue: vi.fn(async () => true), send: vi.fn() }
    const process = vi.fn(async () => 'sent' as const)
    await drainMessagingQueueOnce({ queue, process })
    expect(process).toHaveBeenCalledWith(expect.any(String), 3, expect.any(Function))
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
