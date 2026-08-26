export const FORM_FIELD_TYPES = [
  'short_text',
  'long_text',
  'date',
  'single_choice',
  'multi_choice',
  'boolean',
  'email',
  'phone',
  'cpf',
  'declaration',
] as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]
export type FormClassification = 'administrative' | 'sensitive'

export type FormField = {
  key: string
  type: FormFieldType
  required: boolean
  label: string
  options?: readonly string[]
  declaration?: boolean
}

export type FormTemplateVersion = {
  id: string
  version: number
  classification: FormClassification
  fields: readonly FormField[]
}

export type ValidationError = {
  field: string
  code: 'required' | 'unknown_field' | 'invalid_type'
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function validFieldValue(field: FormField, value: unknown): boolean {
  if (field.type === 'boolean') return typeof value === 'boolean'
  if (field.type === 'multi_choice') return Array.isArray(value) && value.every((item) => typeof item === 'string')
  return typeof value === 'string'
}

export function validateAnswers(
  template: FormTemplateVersion,
  answers: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = []
  const fields = new Map(template.fields.map((field) => [field.key, field]))

  for (const key of Object.keys(answers)) {
    if (!fields.has(key)) errors.push({ field: key, code: 'unknown_field' })
  }
  for (const field of template.fields) {
    const value = answers[field.key]
    if (field.required && isEmpty(value)) {
      errors.push({ field: field.key, code: 'required' })
    } else if (!isEmpty(value) && !validFieldValue(field, value)) {
      errors.push({ field: field.key, code: 'invalid_type' })
    }
  }
  return errors
}
