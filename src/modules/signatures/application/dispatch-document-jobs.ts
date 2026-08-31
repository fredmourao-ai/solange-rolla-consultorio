import type { QueuePort } from '../../../platform/queue/types'

export type DispatchableDocumentJob = {
  id: string
  idempotencyKey: string
}

export interface DocumentDispatchRepository {
  claimPending(limit: number): Promise<DispatchableDocumentJob[]>
  markDispatched(jobId: string, dispatchedAt: string): Promise<void>
  releaseDispatch(jobId: string, errorCode: string): Promise<void>
}

type DocumentsQueue = Pick<QueuePort<{ jobId: string }>, 'send'>

type DispatchDocumentJobsOptions = {
  repository: DocumentDispatchRepository
  queue: DocumentsQueue
  limit?: number
  now?: () => Date
}

export async function dispatchDocumentJobs({
  repository,
  queue,
  limit = 10,
  now = () => new Date(),
}: DispatchDocumentJobsOptions): Promise<{ claimed: number; dispatched: number }> {
  const jobs = await repository.claimPending(limit)
  let dispatched = 0

  for (const job of jobs) {
    try {
      await queue.send({
        kind: 'signed-form.pdf',
        idempotencyKey: job.idempotencyKey,
        correlationId: job.id,
        payload: { jobId: job.id },
      })
    } catch {
      await repository.releaseDispatch(job.id, 'QUEUE_SEND_FAILED')
      continue
    }

    await repository.markDispatched(job.id, now().toISOString())
    dispatched += 1
  }

  return { claimed: jobs.length, dispatched }
}
