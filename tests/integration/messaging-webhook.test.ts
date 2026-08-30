import { describe, expect, it } from 'vitest'
import { createMessagingWebhookHandler, type WebhookProvider } from '../../src/app/api/webhooks/messaging/[provider]/route'

function providerReturning(event: unknown): WebhookProvider {
  return { verifyWebhook: async () => event as never }
}

describe('messaging webhook route', () => {
  it('rejects an invalid signature before persisting anything', async () => {
    let inserts = 0
    const handler = createMessagingWebhookHandler(
      'meta',
      { verifyWebhook: async () => null },
      { insertIfNew: async () => { inserts += 1; return true } },
    )

    const response = await handler(new Request('https://example.test/webhook'), {})

    expect(response.status).toBe(401)
    expect(inserts).toBe(0)
  })

  it('deduplicates the same provider event and uses the provider in the inbox key', async () => {
    const stored: Array<{ provider: string; providerEventId: string }> = []
    const repository = {
      insertIfNew: async (event: { provider: string; providerEventId: string }) => {
        if (stored.some((item) => item.provider === event.provider && item.providerEventId === event.providerEventId)) return false
        stored.push(event)
        return true
      },
    }
    const handler = createMessagingWebhookHandler('meta', providerReturning({ providerEventId: 'evt-1', payload: { status: 'delivered' } }), repository)

    const first = await handler(new Request('https://example.test/webhook'), {})
    const second = await handler(new Request('https://example.test/webhook'), {})

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    await expect(first.json()).resolves.toEqual({ accepted: true, duplicate: false })
    await expect(second.json()).resolves.toEqual({ accepted: true, duplicate: true })
    expect(stored).toEqual([{ provider: 'meta', providerEventId: 'evt-1', payload: { status: 'delivered' } }])
  })

  it('returns a generic bad request for a malformed verified payload', async () => {
    const handler = createMessagingWebhookHandler(
      'meta',
      providerReturning({ providerEventId: '', payload: { status: 'delivered' } }),
      { insertIfNew: async () => true },
    )

    const response = await handler(new Request('https://example.test/webhook'), {})

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid webhook payload' })
  })
})
