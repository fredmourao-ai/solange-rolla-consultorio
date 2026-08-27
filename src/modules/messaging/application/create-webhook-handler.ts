import { ingestProviderEvent, type ProviderEventRepository } from './ingest-provider-event'

export type WebhookProvider = { verifyWebhook(request: Request): Promise<{ providerEventId: string; payload: Record<string, unknown> } | null> }

export function createMessagingWebhookHandler(provider: WebhookProvider, repository: ProviderEventRepository) {
  return async function handleMessagingWebhook(request: Request): Promise<Response> {
    const event = await provider.verifyWebhook(request)
    if (!event) return Response.json({ error: 'invalid webhook' }, { status: 401 })
    const result = await ingestProviderEvent({ provider: 'messaging', providerEventId: event.providerEventId, payload: event.payload }, repository)
    return Response.json({ accepted: true, duplicate: result.duplicate })
  }
}
