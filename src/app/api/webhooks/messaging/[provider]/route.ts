import { ingestProviderEvent, type ProviderEventRepository } from '../../../../../modules/messaging/public'

export type WebhookEvent = {
  providerEventId: string
  payload: Record<string, unknown>
  delivery?: {
    messageId: string
    status: 'sent' | 'delivered' | 'read'
  }
}

export type WebhookProvider = {
  verifyWebhook(request: Request): Promise<WebhookEvent | null>
}

export type MessagingWebhookHandler = (request: Request, context?: unknown) => Promise<Response>

function handlerArguments(
  providerOrName: string | WebhookProvider,
  providerOrRepository: WebhookProvider | ProviderEventRepository,
  repository?: ProviderEventRepository,
): { providerName: string; provider: WebhookProvider; repository: ProviderEventRepository } {
  if (typeof providerOrName === 'string') {
    if (!repository || typeof providerOrRepository !== 'object' || !('verifyWebhook' in providerOrRepository)) {
      throw new Error('WEBHOOK_PROVIDER_CONFIGURATION_REQUIRED')
    }
    return { providerName: providerOrName, provider: providerOrRepository, repository }
  }

  if (typeof providerOrRepository !== 'object' || !('insertIfNew' in providerOrRepository)) {
    throw new Error('WEBHOOK_REPOSITORY_CONFIGURATION_REQUIRED')
  }
  return { providerName: 'messaging', provider: providerOrName, repository: providerOrRepository }
}

export function createMessagingWebhookHandler(
  providerName: string,
  provider: WebhookProvider,
  repository: ProviderEventRepository,
): MessagingWebhookHandler
export function createMessagingWebhookHandler(
  provider: WebhookProvider,
  repository: ProviderEventRepository,
): MessagingWebhookHandler
export function createMessagingWebhookHandler(
  providerOrName: string | WebhookProvider,
  providerOrRepository: WebhookProvider | ProviderEventRepository,
  repository?: ProviderEventRepository,
): MessagingWebhookHandler {
  const argumentsForHandler = handlerArguments(providerOrName, providerOrRepository, repository)

  return async function handleMessagingWebhook(request: Request): Promise<Response> {
    let event: WebhookEvent | null
    try {
      event = await argumentsForHandler.provider.verifyWebhook(request)
    } catch {
      return Response.json({ error: 'invalid webhook payload' }, { status: 400 })
    }

    if (!event) return Response.json({ error: 'invalid webhook signature' }, { status: 401 })

    try {
      const result = await ingestProviderEvent(
        {
          provider: argumentsForHandler.providerName,
          providerEventId: event.providerEventId,
          payload: event.payload,
          delivery: event.delivery,
        },
        argumentsForHandler.repository,
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
  return Response.json({ error: 'provider not configured' }, { status: 503 })
}
