import { describe, expect, it, vi } from 'vitest'
import { createSupabaseDocumentDispatchRepository } from './supabase-document-dispatch-repository'

describe('createSupabaseDocumentDispatchRepository', () => {
  it('claims through the restricted RPC and maps the result', async () => {
    const client = {
      rpc: vi.fn(async () => ({
        data: [{ result_id: 'job-1', result_idempotency_key: 'signed-form:v1' }], error: null,
      })),
      from: vi.fn(),
    } as never
    const repository = createSupabaseDocumentDispatchRepository(client)

    await expect(repository.claimPending(7)).resolves.toEqual([
      { id: 'job-1', idempotencyKey: 'signed-form:v1' },
    ])
    expect((client as never as { rpc: ReturnType<typeof vi.fn> }).rpc)
      .toHaveBeenCalledWith('claim_document_jobs', { p_limit: 7 })
  })

  it('marks dispatch success and retryable queue failure', async () => {
    const updates: unknown[] = []
    const eq = vi.fn(async () => ({ error: null }))
    const client = {
      rpc: vi.fn(),
      from: vi.fn(() => ({ update: (patch: unknown) => { updates.push(patch); return { eq } } })),
    } as never
    const repository = createSupabaseDocumentDispatchRepository(client)

    await repository.markDispatched('job-1', '2026-08-30T04:00:00.000Z')
    await repository.releaseDispatch('job-1', 'QUEUE_SEND_FAILED')

    expect(updates).toEqual([
      { status: 'processing', dispatched_at: '2026-08-30T04:00:00.000Z', last_error_code: null },
      { status: 'failed_retryable', dispatched_at: null, last_error_code: 'QUEUE_SEND_FAILED' },
    ])
    expect(eq).toHaveBeenNthCalledWith(1, 'id', 'job-1')
    expect(eq).toHaveBeenNthCalledWith(2, 'id', 'job-1')
  })
})
