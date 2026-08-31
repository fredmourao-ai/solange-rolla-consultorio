import 'server-only'
import type { SensitiveDataCrypto } from '../../../platform/crypto/types'
import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'
import { validateAnswers, type FormTemplateVersion } from '../domain/form-schema'

export type SubmitFormRepository = {
  submit(input: Record<string, unknown>): Promise<Record<string, unknown>>
}

export async function submitForm(
  input: {
    submissionId: string
    templateVersionId: string
    template: FormTemplateVersion
    answers: Record<string, unknown>
    source?: 'patient_capability' | 'staff'
    publicActionContext?: PublicActionContext
  },
  dependencies: { repository: SubmitFormRepository; crypto: SensitiveDataCrypto },
): Promise<Record<string, unknown>> {
  if (input.templateVersionId !== input.template.id) {
    throw new Error('FORM_TEMPLATE_VERSION_MISMATCH')
  }
  if (input.source === 'patient_capability') {
    assertPublicActionSubject(input.publicActionContext, 'public_form_submit', input.submissionId)
  }
  if (validateAnswers(input.template, input.answers).length > 0) {
    throw new Error('invalid form answers')
  }

  const base = {
    submissionId: input.submissionId,
    templateVersionId: input.templateVersionId,
    status: 'submitted',
  }

  if (input.template.classification === 'administrative') {
    return dependencies.repository.submit({ ...base, answers: input.answers })
  }

  const envelope = await dependencies.crypto.encrypt(
    JSON.stringify(input.answers),
    { entity: 'form_submission', id: input.submissionId },
  )
  return dependencies.repository.submit({
    ...base,
    answersCiphertext: envelope.ciphertext,
    answersIv: envelope.iv,
    answersAuthTag: envelope.authTag,
    keyVersion: envelope.keyVersion,
  })
}
