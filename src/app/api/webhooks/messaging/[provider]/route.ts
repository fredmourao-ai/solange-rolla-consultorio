import { ingestProviderEvent, type ProviderEventRepository } from '../../../../../modules/messaging/public'

export type WebhookEvent = {
  providerEventId: string
  payload: Record<string, unknown>
}

export type WebhookProvider = {
  verifyWebhook(request: Request): Promise<WebhookEvent | null>
}

export type MessagingWebhookHandler = (request: Request, context?: unknown) => Promise<Response>

export function createMessagingWebhookHandler(
  providerName: string,
  provider: WebhookProvider,
  repository: ProviderEventRepository,
): MessagingWebhookHandler {
  return async function handleMessagingWebhook(request: Request): Promise<Response> {
    let event: WebhookEvent | null
    try {
      event = await provider.verifyWebhook(request)
    } catch {
      return Response.json({ error: 'invalid webhook payload' }, { status: 400 })
    }

    if (!event) {
      return Response.json({ error: 'invalid webhook signature' }, { status: 401 })
    }

    try {
      const result = await ingestProviderEvent(
        {
          provider: providerName,
          providerEventId: event.providerEventId,
          payload: event.payload,
        },
        repository,
      )
      return Response.json({ accepted: true, duplicate: result.duplicate })
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_PROVIDER_EVENT') {
        return Response.json({ error: 'invalid webhook payload' }, { status: 400 })
      }
      return Response.json({ error: 'webhook unavailable' }, { status: 503 })
    }
  }
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  void request
  void context
  return Response.json({ error: 'provider not configured' }, { status: 501 })
}
