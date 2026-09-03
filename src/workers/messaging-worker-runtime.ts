import type { QueuePort } from '../platform/queue/types'

type MessagingQueuePayload = { messageId: string }
type ProcessResult = 'sent' | 'retry' | 'failed'
export type WorkerLogger = (event: string, metadata: Record<string, unknown>) => void

type DrainOptions = {
  queue: QueuePort<MessagingQueuePayload>
  process: (messageId: string, attemptNumber: number, retry: (delaySeconds: number) => Promise<void>) => Promise<ProcessResult>
  batchSize?: number
}

function validMessage(message: unknown): message is { kind: 'messaging.deliver'; payload: MessagingQueuePayload } {
  if (!message || typeof message !== 'object') return false
  const candidate = message as { kind?: unknown; payload?: unknown }
  if (candidate.kind !== 'messaging.deliver') return false
  if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) return false
  const payload = candidate.payload as Record<string, unknown>
  return Object.keys(payload).length === 1 && typeof payload.messageId === 'string' && payload.messageId.length > 0
}

/**
 * Pure queue mechanics only -- deliberately does not re-implement send/retry
 * classification. That already lives, tested, in
 * modules/messaging/application/process-message.ts (processMessage); the
 * worker script wires this drain loop's `process` callback straight to it
 * (after loading + rendering the message body) so retry policy has exactly
 * one implementation.
 */
export async function drainMessagingQueueOnce({ queue, process, batchSize = 10 }: DrainOptions): Promise<number> {
  const jobs = await queue.read({ visibilityTimeoutSeconds: 60, batchSize: Math.max(1, Math.min(50, batchSize)) })
  let completed = 0
  for (const job of jobs) {
    if (!validMessage(job.message)) {
      if (!await queue.archive(job.id)) throw new Error('MESSAGING_ARCHIVE_FAILED')
      completed += 1
      continue
    }
    let requeued = false
    const result = await process(
      job.message.payload.messageId,
      Math.max(1, job.readCount),
      async (delaySeconds) => {
        requeued = await queue.requeue(job.id, delaySeconds)
        if (!requeued) throw new Error('MESSAGING_REQUEUE_FAILED')
      },
    )
    if (result === 'retry') {
      if (!requeued) throw new Error('MESSAGING_RETRY_NOT_REQUEUED')
      continue
    }
    if (!await queue.archive(job.id)) throw new Error('MESSAGING_ARCHIVE_FAILED')
    completed += 1
  }
  return completed
}

function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'MESSAGING_WORKER_TRANSIENT'
  return /^[A-Z][A-Z0-9_]{2,99}$/u.test(error.message) ? error.message : 'MESSAGING_WORKER_TRANSIENT'
}

function defaultWait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

export async function runMessagingWorker(options: {
  signal: AbortSignal
  drain: () => Promise<number>
  pollMs?: number
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
  logger?: WorkerLogger
  heartbeat?: () => Promise<void>
}): Promise<void> {
  const pollMs = Math.max(250, options.pollMs ?? 2000)
  const wait = options.wait ?? defaultWait
  while (!options.signal.aborted) {
    try {
      const completed = await options.drain()
      await options.heartbeat?.()
      options.logger?.('messaging_worker_poll_ok', { completed })
    } catch (error) {
      options.logger?.('messaging_worker_poll_failed', { code: safeErrorCode(error) })
    }
    if (!options.signal.aborted) await wait(pollMs, options.signal)
  }
}
