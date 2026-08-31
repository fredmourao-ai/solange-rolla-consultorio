import type { FormClassification, FormTemplateVersion } from '../domain/form-schema'

export type FormSubmissionStatus = 'draft' | 'submitted' | 'signed' | 'superseded'

export type FormSubmissionHeader = {
  id: string
  subjectId: string
  templateVersionId: string
  templateVersion: number
  classification: FormClassification
  status: FormSubmissionStatus
}

export type StartSubmissionRepository = {
  create(input: FormSubmissionHeader): Promise<FormSubmissionHeader>
}

export async function startSubmission(
  input: { id: string; subjectId: string; template: FormTemplateVersion },
  repository: StartSubmissionRepository,
): Promise<FormSubmissionHeader> {
  if (!input.id || !input.subjectId) throw new Error('INVALID_FORM_SUBMISSION')
  return repository.create({
    id: input.id,
    subjectId: input.subjectId,
    templateVersionId: input.template.id,
    templateVersion: input.template.version,
    classification: input.template.classification,
    status: 'draft',
  })
}
