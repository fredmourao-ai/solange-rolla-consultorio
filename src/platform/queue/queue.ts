import type {
  QueueBackend,
  QueueJob,
  QueueName,
  QueuePort,
  QueueReadOptions,
  QueueSendOptions,
} from './types'

type CreateQueueOptions = {
  name: QueueName
  backend: QueueBackend
  now?: () => Date
}

const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 60
const DEFAULT_BATCH_SIZE = 1

export function createQueue<TPayload>({
  name,
  backend,
  now = () => new Date(),
}: CreateQueueOptions): QueuePort<TPayload> {
  return {
    send(message, options: QueueSendOptions = {}) {
      return backend.send(
        name,
        {
          ...message,
          createdAt: now().toISOString(),
        },
        { delaySeconds: options.delaySeconds ?? 0 },
      )
    },

    async read(options: QueueReadOptions = {}) {
      const jobs = await backend.read(name, {
        visibilityTimeoutSeconds:
          options.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT_SECONDS,
        batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
      })

      return jobs as QueueJob<TPayload>[]
    },

    archive(id) {
      return backend.archive(name, id)
    },

    requeue(id, delaySeconds = 0) {
      return backend.requeue(name, id, delaySeconds)
    },
  }
}
