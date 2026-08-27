import { describe, expect, it } from 'vitest'
import { requestFiscalCancellation } from './cancel-fiscal-document'
import type { FiscalDocument } from '../domain/fiscal-document'

const issuedDocument: FiscalDocument = {
  id: 'document-1',
  sourceType: 'appointment_completed',
  sourceId: 'appointment-1',
  personId: 'person-1',
  payerPersonId: 'person-1',
  amountCents: 15000,
  profileVersion: 1,
  treatmentVersion: 1,
  provider: 'mock',
  idempotencyKey: 'appointment-1:1:1',
  status: 'issued',
  externalId: 'mock-nfse-1',
  protocol: 'mock-protocol-1',
}

describe('requestFiscalCancellation', () => {
  it('keeps the issued document and creates a separate cancellation event', () => {
    const result = requestFiscalCancellation(issuedDocument, {
      reason: 'duplicated synthetic document',
      idempotencyKey: 'cancel:document-1:1',
      requestedBy: 'owner-1',
      substituteDocumentId: 'document-2',
    })

    expect(result.document.status).toBe('cancel_requested')
    expect(result.document.externalId).toBe('mock-nfse-1')
    expect(result.cancellation).toMatchObject({
      originalDocumentId: 'document-1',
      reason: 'duplicated synthetic document',
      idempotencyKey: 'cancel:document-1:1',
      substituteDocumentId: 'document-2',
    })
  })
})
