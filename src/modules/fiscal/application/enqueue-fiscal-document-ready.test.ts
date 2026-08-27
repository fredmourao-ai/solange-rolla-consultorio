import { describe, expect, it } from 'vitest'
import { enqueueFiscalDocumentReady } from './enqueue-fiscal-document-ready'

describe('enqueueFiscalDocumentReady', () => {
  it('enqueues only an opaque capability reference', async () => {
    const messages: unknown[] = []
    const result = await enqueueFiscalDocumentReady({
      documentId: 'document-1',
      capabilityId: 'capability-1',
      recipient: 'synthetic@example.test',
      channel: 'email',
    }, {
      enqueueMessage: async (message) => {
        messages.push(message)
        return { id: 'message-1', status: 'queued', ...message }
      },
    })

    expect(result.id).toBe('message-1')
    expect(messages).toEqual([{
      idempotencyKey: 'fiscal-document-ready:document-1',
      channel: 'email',
      recipient: 'synthetic@example.test',
      templateKey: 'fiscal_document_ready',
      payload: { documentId: 'document-1', capabilityId: 'capability-1' },
    }])
  })
})
