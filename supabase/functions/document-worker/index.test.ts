import { describe, expect, it, vi } from 'vitest'
import { drainDocumentQueue } from './index'

function queueJob(overrides: Record<string, unknown> = {}) {
  return {
    id: '42', readCount: 1,
    message: {
      kind: 'signed-form.pdf' as const, idempotencyKey: 'signed-form:v1', correlationId: 'job-1',
      payload: { jobId: '11111111-1111-4111-8111-111111111111' },
      ...overrides,
    },
  }
}

describe('drainDocumentQueue', () => {
  it('archives only after successful document processing', async () => {
    const archive = vi.fn(async () => true)
    const process = vi.fn(async () => 'completed' as const)
    const count = await drainDocumentQueue({
      read: async () => [queueJob()], archive, requeue: vi.fn(), process,
    })
    expect(count).toBe(1)
    expect(process).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
    expect(archive).toHaveBeenCalledWith('42')
  })

  it('requeues retryable failures and does not archive', async () => {
    const archive = vi.fn(async () => true)
    const requeue = vi.fn(async () => true)
    await drainDocumentQueue({
      read: async () => [queueJob()], archive, requeue,
      process: async () => 'retry' as const,
    })
    expect(requeue).toHaveBeenCalledWith('42', 60)
    expect(archive).not.toHaveBeenCalled()
  })

  it('archives final failures because persisted state is terminal', async () => {
    const archive = vi.fn(async () => true)
    await drainDocumentQueue({
      read: async () => [queueJob()], archive, requeue: vi.fn(),
      process: async () => 'failed_final' as const,
    })
    expect(archive).toHaveBeenCalledWith('42')
  })

  it('archives malformed poison jobs without processing content', async () => {
    const archive = vi.fn(async () => true)
    const process = vi.fn()
    await drainDocumentQueue({
      read: async () => [queueJob({ payload: { answers: 'SECRET' } })],
      archive, requeue: vi.fn(), process,
    })
    expect(process).not.toHaveBeenCalled()
    expect(archive).toHaveBeenCalledWith('42')
  })
})
