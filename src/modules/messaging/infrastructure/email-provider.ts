import 'server-only'
import type { MessagingProvider, ProviderDeliveryResult, ProviderMessage } from './mock-provider'

export type EmailTransport = (input: { to: string; body: string; from: string; replyTo?: string; idempotencyKey: string }) => Promise<{ externalId: string; status: string }>

export function createEmailProvider(transport: EmailTransport, config: { from: string; replyTo?: string }): MessagingProvider {
  return { async send(message: ProviderMessage): Promise<ProviderDeliveryResult> {
    if (message.channel !== 'email') throw new Error('EMAIL_PROVIDER_CHANNEL_MISMATCH')
    const result = await transport({ to: message.recipient, body: message.body, from: config.from, replyTo: config.replyTo, idempotencyKey: message.idempotencyKey })
    return { accepted: true, externalId: result.externalId, status: result.status }
  } }
}
