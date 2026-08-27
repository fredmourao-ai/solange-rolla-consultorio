import 'server-only'
import type { ClinicalRecord } from '../domain/clinical-record'
import { createClinicalRecord, type CreateClinicalRecordDependencies } from './create-clinical-record'

export type SupersedeClinicalRecordInput = {
  plaintext: string
  authorUserId: string
}

export async function supersedeClinicalRecord(
  original: ClinicalRecord,
  input: SupersedeClinicalRecordInput,
  dependencies: CreateClinicalRecordDependencies,
): Promise<ClinicalRecord> {
  if (!original.id || input.authorUserId !== original.authorUserId) {
    throw new Error('CLINICAL_RECORD_AUTHOR_FORBIDDEN')
  }

  return createClinicalRecord({
    appointmentId: original.appointmentId,
    personId: original.personId,
    authorUserId: input.authorUserId,
    plaintext: input.plaintext,
    supersedesId: original.id,
  }, dependencies)
}
