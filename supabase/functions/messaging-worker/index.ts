type MessagingQueueMessage = {
  kind: 'messaging.deliver'
  idempotencyKey: string
  correlationId: string
  payload: { messageId: string }
}

type MessagingQueueJob = {
  id: string
  readCount: number
  message: MessagingQueueMessage
}

type ProcessResult = 'sent' | 'retry' | 'failed'

export type MessagingWorkerDependencies = {
  read: () => Promise<MessagingQueueJob[]>
  archive: (id: string) => Promise<boolean>
  requeue: (id: string, delaySeconds: number) => Promise<boolean>
  process: (
    messageId: string,
    attemptNumber: number,
    retry: (delaySeconds: number) => Promise<void>,
  ) => Promise<ProcessResult>
}

function valid(job: MessagingQueueJob): boolean {
  return job.message?.kind === 'messaging.deliver'
    && typeof job.message.payload?.messageId === 'string'
    && job.message.payload.messageId.length > 0
}

export async function drainMessagingQueue(dependencies: MessagingWorkerDependencies): Promise<number> {
  const jobs = await dependencies.read()
  let completed = 0
  for (const job of jobs) {
    if (!valid(job)) {
      await dependencies.archive(job.id)
      completed += 1
      continue
    }
    let requeued = false
    const result = await dependencies.process(
      job.message.payload.messageId,
      Math.max(1, job.readCount),
      async (delaySeconds) => {
        requeued = await dependencies.requeue(job.id, delaySeconds)
        if (!requeued) throw new Error('MESSAGING_REQUEUE_FAILED')
      },
    )
    if (result === 'retry') {
      if (!requeued) throw new Error('MESSAGING_RETRY_NOT_REQUEUED')
      continue
    }
    await dependencies.archive(job.id)
    completed += 1
  }
  return completed
}

declare const Deno: { serve(handler: (request: Request) => Response | Promise<Response>): void }
if (typeof Deno !== 'undefined') {
  Deno.serve(async (request: Request) => {
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
    return Response.json({ accepted: true, queue: 'messaging', worker: 'restricted-runtime' }, { status: 202 })
  })
}
