import { describe, expect, it } from 'vitest'
import { requestNfse, type FiscalDocumentRepository } from './request-nfse'
import type { FiscalDocument } from '../domain/fiscal-document'
import type { FiscalProfile } from '../domain/fiscal-profile'
import type { FiscalTreatment } from '../domain/fiscal-treatment'

const profile: FiscalProfile = {
  version: 3,
  issuerKind: 'individual',
  issuerDocument: '12345678901',
  municipalityCode: '3550308',
  serviceCode: '1.01',
  taxRegime: 'normal',
  effectiveFrom: '2026-01-01T00:00:00Z',
}

const treatment: FiscalTreatment = {
  sourceKind: 'appointment_completed',
  version: 2,
  issuanceRule: 'service_completed',
  enabledForLive: false,
  effectiveFrom: '2026-01-01T00:00:00Z',
  approved: true,
}

class InMemoryFiscalDocuments implements FiscalDocumentRepository {
  readonly documents = new Map<string, FiscalDocument>()

  async findByIdempotencyKey(key: string): Promise<FiscalDocument | null> {
    return this.documents.get(key) ?? null
  }

  async create(document: FiscalDocument): Promise<FiscalDocument> {
    this.documents.set(document.idempotencyKey, document)
    return document
  }
}

describe('requestNfse', () => {
  it('returns the existing snapshot for a repeated source and versions', async () => {
    const repository = new InMemoryFiscalDocuments()
    const input = {
      sourceType: 'appointment_completed' as const,
      sourceId: 'appointment-1',
      personId: 'person-1',
      payerPersonId: 'person-1',
      amountCents: 15000,
      profile,
      treatment,
      payer: { document: '98765432100', address: { city: 'Sao Paulo' } },
    }

    const first = await requestNfse(input, repository)
    const second = await requestNfse(input, repository)

    expect(second).toEqual({ document: first.document, existing: true })
    expect(repository.documents).toHaveLength(1)
    expect(first.document.profileVersion).toBe(3)
    expect(first.document.treatmentVersion).toBe(2)
  })
})
