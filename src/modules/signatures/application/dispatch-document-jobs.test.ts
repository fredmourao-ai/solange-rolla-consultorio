import { describe, expect, it, vi } from 'vitest'
import { dispatchDocumentJobs } from './dispatch-document-jobs'

function job() {
  return { id: 'job-1', idempotencyKey: 'signed-form:version-1' }
}

describe('dispatchDocumentJobs', () => {
  it('publishes only the job reference and marks dispatch after send', async () => {
    const order: string[] = []
    const repository = {
      claimPending: vi.fn(async () => [job()]),
      markDispatched: vi.fn(async () => { order.push('mark') }),
      releaseDispatch: vi.fn(async () => undefined),
    }
    const queue = {
      send: vi.fn(async (message: unknown) => { void message; order.push('send'); return 'queue-1' }),
    }

    await expect(dispatchDocumentJobs({ repository, queue, now: () => new Date('2026-08-30T04:00:00Z') }))
      .resolves.toEqual({ claimed: 1, dispatched: 1 })
    expect(queue.send).toHaveBeenCalledWith({
      kind: 'signed-form.pdf', idempotencyKey: 'signed-form:version-1',
      correlationId: 'job-1', payload: { jobId: 'job-1' },
    })
    expect(order).toEqual(['send', 'mark'])
  })

  it('releases a claimed job when queue send fails', async () => {
    const repository = {
      claimPending: vi.fn(async () => [job()]),
      markDispatched: vi.fn(async () => undefined),
      releaseDispatch: vi.fn(async () => undefined),
    }
    const queue = { send: vi.fn(async () => { throw new Error('network') }) }

    await expect(dispatchDocumentJobs({ repository, queue }))
      .resolves.toEqual({ claimed: 1, dispatched: 0 })
    expect(repository.markDispatched).not.toHaveBeenCalled()
    expect(repository.releaseDispatch).toHaveBeenCalledWith('job-1', 'QUEUE_SEND_FAILED')
  })

  it('can resend the same logical job after send succeeds but mark crashes', async () => {
    const queue = { send: vi.fn(async (message: unknown) => { void message; return 'queue-id' }) }
    const repository = {
      claimPending: vi.fn(async () => [job()]),
      markDispatched: vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue(undefined),
      releaseDispatch: vi.fn(async () => undefined),
    }

    await expect(dispatchDocumentJobs({ repository, queue })).rejects.toThrow('db down')
    await expect(dispatchDocumentJobs({ repository, queue })).resolves.toEqual({ claimed: 1, dispatched: 1 })
    expect(queue.send).toHaveBeenCalledTimes(2)
    expect(queue.send.mock.calls[0]?.[0]).toEqual(queue.send.mock.calls[1]?.[0])
  })
})
