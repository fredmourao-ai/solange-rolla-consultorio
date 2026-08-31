import type { EncryptedEnvelope, SensitiveDataCrypto } from '../../../platform/crypto/types'
import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'
import { validateAnswers, type FormClassification } from '../domain/form-schema'

type SaveDraftInput = {
  submissionId: string
  templateVersionId: string
  classification: FormClassification
  answers: Record<string, unknown>
  template: Parameters<typeof validateAnswers>[0]
  source?: 'patient_capability' | 'staff'
  publicActionContext?: PublicActionContext
}

type DraftRepository = {
  save(draft: Record<string, unknown>): Promise<Record<string, unknown>>
}

type SaveDraftDependencies = {
  repository: DraftRepository
  crypto: SensitiveDataCrypto
}

export async function saveDraft(
  input: SaveDraftInput,
  dependencies: SaveDraftDependencies,
): Promise<Record<string, unknown>> {
  if (input.templateVersionId !== input.template.id) {
    throw new Error('FORM_TEMPLATE_VERSION_MISMATCH')
  }
  if (input.classification !== input.template.classification) {
    throw new Error('FORM_CLASSIFICATION_MISMATCH')
  }
  if (input.source === 'patient_capability') {
    assertPublicActionSubject(input.publicActionContext, 'public_form_save', input.submissionId)
  }
  const draftErrors = validateAnswers(input.template, input.answers)
    .filter((error) => error.code !== 'required')
  if (draftErrors.length > 0) {
    throw new Error('invalid form answers')
  }

  const base = {
    submissionId: input.submissionId,
    templateVersionId: input.templateVersionId,
    status: 'draft',
  }

  if (input.classification === 'sensitive') {
    const envelope: EncryptedEnvelope = await dependencies.crypto.encrypt(
      JSON.stringify(input.answers),
      { entity: 'form_submission', id: input.submissionId },
    )
    return dependencies.repository.save({
      ...base,
      answersCiphertext: envelope.ciphertext,
      answersIv: envelope.iv,
      answersAuthTag: envelope.authTag,
      keyVersion: envelope.keyVersion,
    })
  }

  return dependencies.repository.save({ ...base, answers: input.answers })
}
