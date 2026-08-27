import type {
  EnqueueMessageInput,
  OutboundMessage,
} from '../../messaging/public'

export type FiscalDocumentReadyInput = {
  documentId: string
  capabilityId: string
  recipient: string
  channel: EnqueueMessageInput['channel']
}

export type FiscalDocumentReadyQueue = {
  enqueueMessage: (input: EnqueueMessageInput) => Promise<OutboundMessage>
}

export async function enqueueFiscalDocumentReady(
  input: FiscalDocumentReadyInput,
  queue: FiscalDocumentReadyQueue,
) {
  if (!input.documentId.trim() || !input.capabilityId.trim()) {
    throw new Error('FISCAL_DOCUMENT_CAPABILITY_REQUIRED')
  }

  return queue.enqueueMessage({
    idempotencyKey: `fiscal-document-ready:${input.documentId}`,
    channel: input.channel,
    recipient: input.recipient,
    templateKey: 'fiscal_document_ready',
    payload: {
      documentId: input.documentId,
      capabilityId: input.capabilityId,
    },
  })
}
