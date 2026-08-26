import type { MessageChannel } from '../domain/message'

export type ProviderMessage = { channel: MessageChannel; recipient: string; body: string; idempotencyKey: string }
export type ProviderDeliveryResult = { accepted: boolean; externalId?: string; status: string }
export type MessagingProvider = { send(message: ProviderMessage): Promise<ProviderDeliveryResult> }

export function createMockProvider(): MessagingProvider & { sent: ProviderMessage[] } {
  const sent: ProviderMessage[] = []
  return { sent, async send(message) { sent.push(message); return { accepted: true, externalId: `mock:${sent.length}`, status: 'accepted' } } }
}
