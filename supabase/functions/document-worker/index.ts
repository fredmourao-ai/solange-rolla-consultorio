type DocumentQueueMessage = {
  kind: 'signed-form.pdf'
  idempotencyKey: string
  correlationId: string
  payload: { jobId: string }
}

type DocumentQueueJob = {
  id: string
  readCount: number
  message: DocumentQueueMessage
}

type ProcessResult = 'completed' | 'retry' | 'failed_final'

export type DocumentWorkerDependencies = {
  read: () => Promise<DocumentQueueJob[]>
  archive: (id: string) => Promise<boolean>
  requeue: (id: string, delaySeconds: number) => Promise<boolean>
  process: (jobId: string) => Promise<ProcessResult>
}

function valid(job: DocumentQueueJob): boolean {
  const payload = job.message?.payload
  return job.message?.kind === 'signed-form.pdf'
    && typeof job.message.idempotencyKey === 'string'
    && typeof payload?.jobId === 'string'
    && /^[0-9a-f-]{36}$/iu.test(payload.jobId)
    && Object.keys(payload).length === 1
}

export async function drainDocumentQueue(dependencies: DocumentWorkerDependencies): Promise<number> {
  const jobs = await dependencies.read()
  let completed = 0
  for (const job of jobs) {
    if (!valid(job)) {
      await dependencies.archive(job.id)
      completed += 1
      continue
    }
    const result = await dependencies.process(job.message.payload.jobId)
    if (result === 'retry') {
      const requeued = await dependencies.requeue(job.id, 60)
      if (!requeued) throw new Error('DOCUMENT_REQUEUE_FAILED')
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
    return Response.json({ accepted: true, queue: 'documents', worker: 'restricted-runtime' }, { status: 202 })
  })
}
