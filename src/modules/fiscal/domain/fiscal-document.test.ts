import { describe, expect, it } from 'vitest'
import { transitionFiscalDocument, type FiscalDocument } from './fiscal-document'

const queuedDocument: FiscalDocument = {
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
  status: 'queued',
}

describe('fiscal document state machine', () => {
  it('allows processing only after a document is queued', () => {
    expect(transitionFiscalDocument(queuedDocument, 'processing')).toEqual({
      ...queuedDocument,
      status: 'processing',
    })
  })

  it('rejects issuing directly from a new document', () => {
    expect(() => transitionFiscalDocument({ ...queuedDocument, status: 'not_ready' }, 'issued')).toThrow('INVALID_FISCAL_DOCUMENT_TRANSITION')
  })
})
