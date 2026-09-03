import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFetchWhatsAppTransport } from './fetch-whatsapp-transport'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetch WhatsApp transport', () => {
  it('sends a text message and returns the provider message id', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ messages: [{ id: 'wamid.TEST123' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const transport = createFetchWhatsAppTransport('v23.0')
    const result = await transport({ recipient: '+5511999990000', body: 'Olá', token: 'tok', phoneNumberId: 'phone-1', signal: new AbortController().signal })

    expect(result).toEqual({ externalId: 'wamid.TEST123', status: 'accepted' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v23.0/phone-1/messages')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' })
    expect(JSON.parse(init.body as string)).toMatchObject({ to: '+5511999990000', type: 'text', text: { body: 'Olá' } })
  })

  it('classifies a 429 as transient so the caller can retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 })))
    const transport = createFetchWhatsAppTransport('v23.0')
    await expect(transport({ recipient: '+5511999990000', body: 'Olá', token: 'tok', phoneNumberId: 'phone-1', signal: new AbortController().signal }))
      .rejects.toThrow(/WHATSAPP_TRANSIENT_/)
  })

  it('classifies a 400 (e.g. re-engagement window) as a permanent rejection, not transient', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Re-engagement message', code: 131047 } }), { status: 400 })))
    const transport = createFetchWhatsAppTransport('v23.0')
    await expect(transport({ recipient: '+5511999990000', body: 'Olá', token: 'tok', phoneNumberId: 'phone-1', signal: new AbortController().signal }))
      .rejects.toThrow(/WHATSAPP_REJECTED_/)
  })
})
