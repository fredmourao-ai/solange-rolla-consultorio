import { describe, expect, it } from 'vitest'
import { createMessagingWebhookHandler } from './create-webhook-handler'

describe('messaging webhook handler', () => {
  it('rejects unverifiable events before persistence', async () => {
    let inserts = 0
    const handler = createMessagingWebhookHandler({ verifyWebhook: async () => null }, { insertIfNew: async () => { inserts += 1; return true } })
    const response = await handler(new Request('https://example.test/webhook'))
    expect(response.status).toBe(401)
    expect(inserts).toBe(0)
  })

  it('persists verified events idempotently', async () => {
    const handler = createMessagingWebhookHandler({ verifyWebhook: async () => ({ providerEventId: 'event-1', payload: { safe: true } }) }, { insertIfNew: async () => true })
    const response = await handler(new Request('https://example.test/webhook'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ accepted: true, duplicate: false })
  })
})
