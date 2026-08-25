export const QUEUE_NAMES = ['messaging', 'automations', 'documents', 'fiscal'] as const

export type QueueName = (typeof QUEUE_NAMES)[number]

export type QueueMessageInput<TPayload> = {
  kind: string
  idempotencyKey: string
  correlationId: string
  payload: TPayload
}

export type QueueMessage<TPayload> = QueueMessageInput<TPayload> & {
  createdAt: string
}

export type QueueJob<TPayload> = {
  id: string
  readCount: number
  enqueuedAt: string
  visibleAt: string
  message: QueueMessage<TPayload>
}

export type QueueSendOptions = { delaySeconds?: number }
export type QueueReadOptions = { visibilityTimeoutSeconds?: number; batchSize?: number }

export interface QueuePort<TPayload> {
  send(message: QueueMessageInput<TPayload>, options?: QueueSendOptions): Promise<string>
  read(options?: QueueReadOptions): Promise<QueueJob<TPayload>[]>
  archive(id: string): Promise<boolean>
  requeue(id: string, delaySeconds?: number): Promise<boolean>
}

export interface QueueBackend {
  send(queueName: QueueName, message: QueueMessage<unknown>, options: Required<QueueSendOptions>): Promise<string>
  read(queueName: QueueName, options: Required<QueueReadOptions>): Promise<QueueJob<unknown>[]>
  archive(queueName: QueueName, id: string): Promise<boolean>
  requeue(queueName: QueueName, id: string, delaySeconds: number): Promise<boolean>
}
