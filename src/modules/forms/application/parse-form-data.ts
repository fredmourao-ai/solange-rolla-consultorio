import type { FormTemplateVersion } from '../domain/form-schema'

function text(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseFormDataAnswers(
  template: FormTemplateVersion,
  formData: FormData,
): Record<string, unknown> {
  const answers: Record<string, unknown> = {}

  for (const field of template.fields) {
    if (field.type === 'multi_choice') {
      answers[field.key] = formData.getAll(field.key)
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
      continue
    }

    if (field.type === 'boolean' || field.type === 'declaration') {
      const value = formData.get(field.key)
      answers[field.key] = value === 'true' || value === 'on'
      continue
    }

    answers[field.key] = text(formData.get(field.key))
  }

  return answers
}
