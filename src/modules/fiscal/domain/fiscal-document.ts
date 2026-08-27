import type { FiscalSourceKind } from './fiscal-treatment'

export type FiscalDocumentStatus =
  | 'not_ready'
  | 'ready'
  | 'queued'
  | 'processing'
  | 'issued'
  | 'failed_retryable'
  | 'failed_final'
  | 'cancel_requested'
  | 'cancelled'
  | 'replaced'

export type FiscalDocument = {
  id: string
  sourceType: FiscalSourceKind
  sourceId: string
  personId: string
  payerPersonId: string
  amountCents: number
  profileVersion: number
  treatmentVersion: number
  provider: string
  idempotencyKey: string
  status: FiscalDocumentStatus
  externalId?: string
  protocol?: string
  issuedAt?: string
  cancelledAt?: string
}

const allowedTransitions: Record<FiscalDocumentStatus, readonly FiscalDocumentStatus[]> = {
  not_ready: ['ready', 'failed_final'],
  ready: ['not_ready', 'queued'],
  queued: ['processing', 'failed_retryable', 'failed_final'],
  processing: ['issued', 'failed_retryable', 'failed_final', 'cancel_requested'],
  issued: ['cancel_requested', 'replaced'],
  failed_retryable: ['queued', 'processing', 'failed_final'],
  failed_final: ['ready'],
  cancel_requested: ['cancelled', 'replaced', 'failed_retryable'],
  cancelled: [],
  replaced: [],
}

export function canTransitionFiscalDocument(
  from: FiscalDocumentStatus,
  to: FiscalDocumentStatus,
): boolean {
  return allowedTransitions[from].includes(to)
}

export function transitionFiscalDocument(
  document: FiscalDocument,
  nextStatus: FiscalDocumentStatus,
): FiscalDocument {
  if (!canTransitionFiscalDocument(document.status, nextStatus)) {
    throw new Error('INVALID_FISCAL_DOCUMENT_TRANSITION')
  }

  return { ...document, status: nextStatus }
}
