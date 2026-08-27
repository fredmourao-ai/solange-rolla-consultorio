import type { EncryptedEnvelope } from '../../../platform/crypto/types'

export type ClinicalRecord = {
  id: string
  appointmentId: string
  personId: string
  authorUserId: string
  ciphertext: string
  iv: string
  authTag: string
  keyVersion: number
  supersedesId?: string
  createdAt: string
}

export type ClinicalRecordInsert = Omit<ClinicalRecord, 'createdAt'> & {
  createdAt?: string
}

export function envelopeFields(envelope: EncryptedEnvelope): Pick<ClinicalRecord, 'ciphertext' | 'iv' | 'authTag' | 'keyVersion'> {
  return {
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    authTag: envelope.authTag,
    keyVersion: envelope.keyVersion,
  }
}
