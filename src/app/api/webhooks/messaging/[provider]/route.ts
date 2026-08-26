import { ingestProviderEvent } from '@/modules/messaging/public'

type WebhookProvider = { verifyWebhook(request: Request): Promise<{ providerEventId: string; payload: Record<string, unknown> } | null> }

export function createMessagingWebhookHandler(provider: WebhookProvider, repository: Parameters<typeof ingestProviderEvent>[1]) {
  return async function POST(request: Request): Promise<Response> {
    const event = await provider.verifyWebhook(request)
    if (!event) return Response.json({ error: 'invalid webhook' }, { status: 401 })
    const result = await ingestProviderEvent({ provider: 'messaging', providerEventId: event.providerEventId, payload: event.payload }, repository)
    return Response.json({ accepted: true, duplicate: result.duplicate })
  }
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  void context
  return Response.json({ error: 'provider not configured' }, { status: 501 })
}
