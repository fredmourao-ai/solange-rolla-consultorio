import 'server-only'
import type { ClinicalRecord } from '../domain/clinical-record'

export type ClinicalRecordMetadata = Pick<ClinicalRecord, 'id' | 'appointmentId' | 'personId' | 'createdAt' | 'supersedesId'>

export type ClinicalRecordMetadataReader = {
  listMetadata: (personId: string) => Promise<ClinicalRecordMetadata[]>
}

export async function listClinicalRecords(
  personId: string,
  reader: ClinicalRecordMetadataReader,
): Promise<ClinicalRecordMetadata[]> {
  if (!personId.trim()) throw new Error('CLINICAL_PERSON_REQUIRED')
  return reader.listMetadata(personId)
}
