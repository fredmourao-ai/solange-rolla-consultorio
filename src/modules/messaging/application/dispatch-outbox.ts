import type { QueuePort } from '../../../platform/queue/types'
import type { OutboundMessage } from '../domain/message'

export type OutboxRepository = {
  claimQueued(limit: number): Promise<OutboundMessage[]>
  markDispatched(id: string): Promise<void>
}

export async function dispatchOutbox(
  repository: OutboxRepository,
  queue: QueuePort<{ messageId: string }>,
  limit = 10,
): Promise<number> {
  const messages = await repository.claimQueued(limit)
  for (const message of messages) {
    await queue.send({ kind: 'messaging.deliver', idempotencyKey: message.idempotencyKey, correlationId: message.id, payload: { messageId: message.id } })
    await repository.markDispatched(message.id)
  }
  return messages.length
}
