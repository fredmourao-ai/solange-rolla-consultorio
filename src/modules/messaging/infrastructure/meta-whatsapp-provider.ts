import 'server-only'
import { serverEnv } from '../../../platform/env/server'
import type { MessagingProvider, ProviderDeliveryResult, ProviderMessage } from './mock-provider'

type WhatsAppTransport = (input: { recipient: string; body: string; token: string; phoneNumberId: string; signal: AbortSignal }) => Promise<{ externalId: string; status: string }>

export function createMetaWhatsAppProvider(transport: WhatsAppTransport): MessagingProvider {
  return {
    async send(message: ProviderMessage): Promise<ProviderDeliveryResult> {
      const env = serverEnv()
      if (!env.WHATSAPP_LIVE_ENABLED) return { accepted: false, status: 'disabled' }
      const token = process.env.WHATSAPP_ACCESS_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
      if (!token || !phoneNumberId) throw new Error('WHATSAPP_CONFIGURATION_REQUIRED')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      try {
        const result = await transport({ recipient: message.recipient, body: message.body, token, phoneNumberId, signal: controller.signal })
        return { accepted: true, externalId: result.externalId, status: result.status }
      } finally { clearTimeout(timeout) }
    },
  }
}
