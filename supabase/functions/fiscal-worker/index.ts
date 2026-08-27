type FiscalQueueMessage = {
  kind: 'fiscal.issue' | 'fiscal.status' | 'fiscal.cancel'
  idempotencyKey: string
  correlationId: string
  payload: Record<string, unknown>
}

type FiscalQueueJob = { id: string; message: FiscalQueueMessage }

export type FiscalWorkerDependencies = {
  read: () => Promise<FiscalQueueJob[]>
  archive: (id: string) => Promise<boolean>
  requeue: (id: string, delaySeconds: number) => Promise<boolean>
  process: (message: FiscalQueueMessage) => Promise<void>
}

export async function drainFiscalQueue(dependencies: FiscalWorkerDependencies): Promise<number> {
  const jobs = await dependencies.read()
  let processed = 0
  for (const job of jobs) {
    try {
      await dependencies.process(job.message)
      await dependencies.archive(job.id)
      processed += 1
    } catch {
      await dependencies.requeue(job.id, 30)
    }
  }
  return processed
}

declare const Deno: { serve(handler: (request: Request) => Response | Promise<Response>): void }

if (typeof Deno !== 'undefined') {
  Deno.serve(async (request: Request) => {
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
    return Response.json({ accepted: true, queue: 'fiscal', worker: 'restricted-runtime' }, { status: 202 })
  })
}
