import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import { envelopeFields, type ClinicalRecord, type ClinicalRecordInsert } from '../domain/clinical-record'

export type CreateClinicalRecordInput = {
  appointmentId: string
  personId: string
  authorUserId: string
  plaintext: string
  supersedesId?: string
}

export type ClinicalRecordRepository = {
  insert: (record: ClinicalRecordInsert) => Promise<ClinicalRecord>
}

export type CreateClinicalRecordDependencies = {
  crypto: SensitiveDataCrypto
  repository: ClinicalRecordRepository
  idFactory?: () => string
}

export async function createClinicalRecord(
  input: CreateClinicalRecordInput,
  dependencies: CreateClinicalRecordDependencies,
): Promise<ClinicalRecord> {
  if (!input.appointmentId || !input.personId || !input.authorUserId || !input.plaintext.trim()) {
    throw new Error('INVALID_CLINICAL_RECORD')
  }

  const id = dependencies.idFactory?.() ?? randomUUID()
  const envelope = await dependencies.crypto.encrypt(input.plaintext, {
    entity: 'clinical-record',
    id,
  })
  return dependencies.repository.insert({
    id,
    appointmentId: input.appointmentId,
    personId: input.personId,
    authorUserId: input.authorUserId,
    ...envelopeFields(envelope),
    supersedesId: input.supersedesId,
  })
}
