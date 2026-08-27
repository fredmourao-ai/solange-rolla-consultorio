import { evaluateFiscalReadiness, type FiscalPayer } from './evaluate-fiscal-readiness'
import type { FiscalDocument } from '../domain/fiscal-document'
import type { FiscalProfile } from '../domain/fiscal-profile'
import type { FiscalSourceKind, FiscalTreatment } from '../domain/fiscal-treatment'

export interface FiscalDocumentRepository {
  findByIdempotencyKey(key: string): Promise<FiscalDocument | null>
  create(document: FiscalDocument): Promise<FiscalDocument>
}

export type RequestNfseInput = {
  sourceType: FiscalSourceKind
  sourceId: string
  personId: string
  payerPersonId: string
  amountCents: number
  profile: FiscalProfile
  treatment: FiscalTreatment
  payer?: FiscalPayer
  provider?: string
}

export async function requestNfse(
  input: RequestNfseInput,
  repository: FiscalDocumentRepository,
): Promise<{ document: FiscalDocument; existing: boolean }> {
  const readiness = evaluateFiscalReadiness({
    sourceKind: input.sourceType,
    amountCents: input.amountCents,
    profile: input.profile,
    treatment: input.treatment,
    payer: input.payer ?? null,
  })
  if (readiness.status !== 'ready') throw new Error('FISCAL_NOT_READY')

  const idempotencyKey = [
    input.sourceType,
    input.sourceId,
    input.profile.version,
    input.treatment.version,
  ].join(':')
  const existing = await repository.findByIdempotencyKey(idempotencyKey)
  if (existing) return { document: existing, existing: true }

  const document: FiscalDocument = {
    id: `fiscal-document-${idempotencyKey}`,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    personId: input.personId,
    payerPersonId: input.payerPersonId,
    amountCents: input.amountCents,
    profileVersion: input.profile.version,
    treatmentVersion: input.treatment.version,
    provider: input.provider ?? 'mock',
    idempotencyKey,
    status: 'ready',
  }
  return { document: await repository.create(document), existing: false }
}
