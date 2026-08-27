import 'server-only'
import type { EncryptedEnvelope, SensitiveDataCrypto } from '../../../platform/crypto/types'

export type ClinicalRecordEnvelope = {
  id: string
  appointmentId: string
  personId: string
  createdAt: string
  supersedesId?: string
  envelope: EncryptedEnvelope
}

export type ClinicalRecordEnvelopeReader = {
  getEnvelope: (id: string) => Promise<ClinicalRecordEnvelope | null>
}

export type GetClinicalRecordDependencies = {
  crypto: SensitiveDataCrypto
  reader: ClinicalRecordEnvelopeReader
}

export async function getClinicalRecord(
  id: string,
  dependencies: GetClinicalRecordDependencies,
) {
  if (!id.trim()) throw new Error('CLINICAL_RECORD_REQUIRED')
  const record = await dependencies.reader.getEnvelope(id)
  if (!record) throw new Error('CLINICAL_RECORD_NOT_FOUND')

  let plaintext: string
  try {
    plaintext = await dependencies.crypto.decrypt(record.envelope, {
      entity: 'clinical-record',
      id: record.id,
    })
  } catch (error) {
    throw new Error('CLINICAL_RECORD_INTEGRITY_ERROR', { cause: error })
  }

  return {
    id: record.id,
    appointmentId: record.appointmentId,
    personId: record.personId,
    createdAt: record.createdAt,
    supersedesId: record.supersedesId,
    plaintext,
  }
}
