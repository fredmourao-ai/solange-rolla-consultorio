import 'server-only'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'
import type { FormClassification } from '../domain/form-schema'
import type { FormSubmissionStatus } from './start-submission'

export type StoredFormSubmission = {
  id: string
  templateVersionId: string
  classification: FormClassification
  status: FormSubmissionStatus
  answers?: Record<string, unknown>
  answersCiphertext?: string
  answersIv?: string
  answersAuthTag?: string
  keyVersion?: number
}

export type ReadSubmissionRepository = {
  findCurrent(submissionId: string): Promise<StoredFormSubmission | null>
}

function parseAnswers(plaintext: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(plaintext)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('FORM_SUBMISSION_ENVELOPE_INVALID')
  }
  return parsed as Record<string, unknown>
}

export async function readSubmission(
  input: {
    submissionId: string
    source?: 'patient_capability' | 'staff'
    publicActionContext?: PublicActionContext
  },
  dependencies: { repository: ReadSubmissionRepository; crypto: SensitiveDataCrypto },
): Promise<StoredFormSubmission & { answers: Record<string, unknown> }> {
  if (input.source === 'patient_capability') {
    assertPublicActionSubject(input.publicActionContext, 'public_form_read', input.submissionId)
  }

  const stored = await dependencies.repository.findCurrent(input.submissionId)
  if (!stored) throw new Error('FORM_SUBMISSION_NOT_FOUND')
  if (stored.classification === 'administrative') {
    return { ...stored, answers: stored.answers ?? {} }
  }
  if (!stored.answersCiphertext || !stored.answersIv || !stored.answersAuthTag || stored.keyVersion === undefined) {
    throw new Error('FORM_SUBMISSION_ENVELOPE_INVALID')
  }

  const plaintext = await dependencies.crypto.decrypt({
    alg: 'A256GCM', keyVersion: stored.keyVersion, iv: stored.answersIv,
    ciphertext: stored.answersCiphertext, authTag: stored.answersAuthTag,
  }, { entity: 'form_submission', id: stored.id })
  return { ...stored, answers: parseAnswers(plaintext) }
}
