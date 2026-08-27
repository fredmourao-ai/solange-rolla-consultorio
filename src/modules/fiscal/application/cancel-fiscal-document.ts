import {
  transitionFiscalDocument,
  type FiscalDocument,
} from '../domain/fiscal-document'

export type FiscalCancellationInput = {
  reason: string
  idempotencyKey: string
  requestedBy: string
  substituteDocumentId?: string
}

export type FiscalCancellationEvent = {
  originalDocumentId: string
  reason: string
  idempotencyKey: string
  requestedBy: string
  substituteDocumentId?: string
  requestedAt: string
}

export type FiscalCancellationResult = {
  document: FiscalDocument
  cancellation: FiscalCancellationEvent
}

export function requestFiscalCancellation(
  document: FiscalDocument,
  input: FiscalCancellationInput,
): FiscalCancellationResult {
  if (document.status !== 'issued') {
    throw new Error('FISCAL_DOCUMENT_NOT_ISSUED')
  }
  if (!input.reason.trim() || !input.idempotencyKey.trim() || !input.requestedBy.trim()) {
    throw new Error('INVALID_FISCAL_CANCELLATION')
  }

  return {
    document: transitionFiscalDocument(document, 'cancel_requested'),
    cancellation: {
      originalDocumentId: document.id,
      reason: input.reason.trim(),
      idempotencyKey: input.idempotencyKey.trim(),
      requestedBy: input.requestedBy,
      substituteDocumentId: input.substituteDocumentId,
      requestedAt: new Date().toISOString(),
    },
  }
}
