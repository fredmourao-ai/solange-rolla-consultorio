import type { ReactNode } from 'react'
import { FormField } from '../../../shared/ui/form-field'
import type { FormField as FormFieldSchema, FormTemplateVersion } from '../domain/form-schema'

export type FormRendererProps = {
  template: FormTemplateVersion
  answers?: Record<string, unknown>
  errors?: Record<string, string>
  disabled?: boolean
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function selectedValues(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function ChoiceField({
  field, value, error, disabled,
}: {
  field: FormFieldSchema
  value: unknown
  error?: string
  disabled: boolean
}) {
  const multiple = field.type === 'multi_choice'
  const selected = multiple ? selectedValues(value) : [stringValue(value)]
  return (
    <fieldset className="form-field" aria-invalid={error ? 'true' : undefined}>
      <legend className="form-field__label">{field.label}</legend>
      {(field.options ?? []).map((option, index) => {
        const id = `form-${field.key}-${index}`
        return (
          <label key={option} htmlFor={id} className="choice-control">
            <input
              className="ui-checkbox"
              id={id}
              name={field.key}
              type={multiple ? 'checkbox' : 'radio'}
              value={option}
              defaultChecked={selected.includes(option)}
              required={field.required && !multiple}
              aria-required={field.required || undefined}
              disabled={disabled}
            />
            <span>{option}</span>
          </label>
        )
      })}
      {error && <span className="form-field__error" role="alert">{error}</span>}
    </fieldset>
  )
}

function StandardControl({ field, value, disabled }: {
  field: FormFieldSchema
  value: unknown
  disabled: boolean
}): ReactNode {
  const common = {
    id: `form-${field.key}`,
    name: field.key,
    required: field.required,
    'aria-required': field.required || undefined,
    disabled,
  }

  if (field.type === 'long_text') {
    return <textarea className="ui-textarea" {...common} defaultValue={stringValue(value)} />
  }
  if (field.type === 'boolean' || field.type === 'declaration') {
    return <input className="ui-checkbox" {...common} type="checkbox" value="true" defaultChecked={value === true} />
  }

  const type = field.type === 'date' ? 'date'
    : field.type === 'email' ? 'email'
      : field.type === 'phone' ? 'tel'
        : 'text'
  const inputMode = field.type === 'cpf' ? 'numeric' : field.type === 'phone' ? 'tel' : undefined
  return (
    <input
      className="ui-input"
      {...common}
      type={type}
      inputMode={inputMode}
      autoComplete={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'off'}
      defaultValue={stringValue(value)}
    />
  )
}

export function FormRenderer({ template, answers = {}, errors = {}, disabled = false }: FormRendererProps) {
  return (
    <div className="intake-form" data-template-version={template.version}>
      {template.fields.map((field) => {
        const error = errors[field.key]
        if (field.type === 'single_choice' || field.type === 'multi_choice') {
          return <ChoiceField key={field.key} field={field} value={answers[field.key]} error={error} disabled={disabled} />
        }
        return (
          <FormField key={field.key} id={`form-${field.key}`} label={field.label} error={error}>
            {StandardControl({ field, value: answers[field.key], disabled })}
          </FormField>
        )
      })}
    </div>
  )
}
