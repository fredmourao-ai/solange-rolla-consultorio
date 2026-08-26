import type { EncryptedEnvelope, SensitiveDataCrypto } from '../../../platform/crypto/types'
import { validateAnswers, type FormClassification } from '../domain/form-schema'

type SaveDraftInput = {
  submissionId: string
  templateVersionId: string
  classification: FormClassification
  answers: Record<string, unknown>
  template: Parameters<typeof validateAnswers>[0]
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
  if (validateAnswers(input.template, input.answers).length > 0) {
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
