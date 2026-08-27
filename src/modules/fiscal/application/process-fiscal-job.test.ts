import { describe, expect, it } from 'vitest'
import { processFiscalJob, type FiscalJobRepository } from './process-fiscal-job'
import type { NfseProvider } from './nfse-provider'
import type { FiscalDocument } from '../domain/fiscal-document'

const document: FiscalDocument = {
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

class InMemoryFiscalJobRepository implements FiscalJobRepository {
  readonly attempts: string[] = []
  current = document

  async recordAttempt(status: 'started' | 'succeeded' | 'retryable_failure' | 'final_failure'): Promise<void> {
    this.attempts.push(status)
  }

  async update(documentUpdate: FiscalDocument): Promise<FiscalDocument> {
    this.current = documentUpdate
    return documentUpdate
  }
}

describe('processFiscalJob', () => {
  it('records an attempt before and after issuing a queued document', async () => {
    const repository = new InMemoryFiscalJobRepository()
    const provider: NfseProvider = {
      issue: async () => ({ externalId: 'mock-nfse-1', protocol: 'mock-protocol-1', status: 'issued', synthetic: true }),
      getStatus: async () => ({ externalId: 'mock-nfse-1', status: 'issued' }),
      cancel: async () => ({ externalId: 'mock-nfse-1', status: 'cancelled' }),
    }

    const result = await processFiscalJob(document, {
      issuerDocument: '12345678901',
      serviceCode: '1.01',
      payerDocument: '98765432100',
      correlationId: 'correlation-1',
    }, repository, provider)

    expect(repository.attempts).toEqual(['started', 'succeeded'])
    expect(result.status).toBe('issued')
    expect(result.externalId).toBe('mock-nfse-1')
  })
})
