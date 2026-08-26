import { assertAdministrativePayload, type MessageChannel, type OutboundMessage } from '../domain/message'

export type EnqueueMessageInput = Omit<OutboundMessage, 'id' | 'status'>
export type MessageRepository = {
  findByIdempotencyKey(key: string): Promise<OutboundMessage | null>
  insert(message: EnqueueMessageInput): Promise<OutboundMessage>
}

export async function enqueueMessage(input: EnqueueMessageInput, repository: MessageRepository): Promise<OutboundMessage> {
  if (!input.idempotencyKey.trim()) throw new Error('IDEMPOTENCY_KEY_REQUIRED')
  assertAdministrativePayload(input.payload)
  const existing = await repository.findByIdempotencyKey(input.idempotencyKey)
  if (existing) return existing
  return repository.insert(input)
}

export type { MessageChannel }
