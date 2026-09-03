import 'server-only'

type WhatsAppTransport = (input: { recipient: string; body: string; token: string; phoneNumberId: string; signal: AbortSignal }) => Promise<{ externalId: string; status: string }>

/**
 * Real Meta WhatsApp Business Cloud API transport for
 * createMetaWhatsAppProvider(). Sends a plain-text message.
 *
 * KNOWN PRODUCTION LIMITATION: Meta only allows free-form "text" messages
 * within an open 24h customer-service session (the patient messaged us
 * recently). Appointment confirmations are business-initiated and sent
 * ~24h *before* the appointment, which is always outside any such session,
 * so Meta will reject a text-type send for that case with error code 131047
 * ("re-engagement message"). Sending those correctly requires a message
 * pre-approved in Meta Business Manager as a template (type: "template",
 * with a template name/language and structured parameters instead of a
 * rendered body string) -- that requires a real Meta Business Manager
 * account and template review, which this change cannot provide. Until an
 * approved template exists and this transport is extended to use it,
 * WHATSAPP_LIVE_ENABLED must stay off for anything except reactive
 * within-session replies.
 */
export function createFetchWhatsAppTransport(apiVersion: string): WhatsAppTransport {
  return async function sendWhatsAppText({ recipient, body, token, phoneNumberId, signal }) {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body },
      }),
      signal,
    })
    const payload = (await response.json().catch(() => null)) as { messages?: { id?: string }[]; error?: { message?: string; code?: number } } | null
    if (!response.ok || !payload?.messages?.[0]?.id) {
      // The worker's retry classifier (safeErrorCode in messaging-worker-runtime)
      // only trusts a clean ALL_CAPS error.message as a real code; Meta's own
      // (arbitrary, free-text) error reason goes on `cause` instead so it never
      // leaks into -- and defeats -- that classification.
      const reason = payload?.error?.message ?? `HTTP_${response.status}`
      throw new Error(response.status >= 500 || response.status === 429 ? 'WHATSAPP_TRANSIENT' : 'WHATSAPP_REJECTED', { cause: reason })
    }
    return { externalId: payload.messages[0].id, status: 'accepted' }
  }
}
