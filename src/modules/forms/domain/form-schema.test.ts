import { describe, expect, it } from 'vitest'
import { validateAnswers, type FormTemplateVersion } from './form-schema'

const schema: FormTemplateVersion = {
  id: '00000000-0000-0000-0000-000000000001',
  version: 1,
  classification: 'sensitive',
  fields: [
    { key: 'full_name', type: 'short_text', required: true, label: 'Nome' },
    { key: 'consent', type: 'boolean', required: true, label: 'Aceite', declaration: true },
  ],
}

describe('versioned form schema', () => {
  it('requires declared fields', () => {
    expect(validateAnswers(schema, {})).toEqual([
      { field: 'full_name', code: 'required' },
      { field: 'consent', code: 'required' },
    ])
  })

  it('requires an affirmative value for required boolean declarations', () => {
    expect(validateAnswers(schema, { full_name: 'Pessoa Sintética', consent: false })).toContainEqual({
      field: 'consent',
      code: 'required',
    })
  })

  it('validates declaration fields as affirmative booleans', () => {
    const declarationSchema = {
      ...schema,
      fields: [{ key: 'declaration', type: 'declaration' as const, required: true, label: 'Declaro' }],
    }
    expect(validateAnswers(declarationSchema, { declaration: true })).toEqual([])
    expect(validateAnswers(declarationSchema, { declaration: false })).toContainEqual({ field: 'declaration', code: 'required' })
  })

  it('rejects choice values that are not declared by the versioned template', () => {
    const choiceSchema = {
      ...schema,
      fields: [
        { key: 'channel', type: 'single_choice' as const, required: true, label: 'Canal', options: ['WhatsApp', 'E-mail'] },
        { key: 'topics', type: 'multi_choice' as const, required: false, label: 'Temas', options: ['Família', 'Trabalho'] },
      ],
    }
    expect(validateAnswers(choiceSchema, { channel: 'SMS', topics: ['Família', 'Outro'] })).toEqual([
      { field: 'channel', code: 'invalid_type' },
      { field: 'topics', code: 'invalid_type' },
    ])
  })

  it('accepts valid answers and rejects unknown fields', () => {
    expect(validateAnswers(schema, { full_name: 'Pessoa Sintética', consent: true })).toEqual([])
    expect(validateAnswers(schema, { full_name: 'Pessoa Sintética', other: 'x' })).toContainEqual({
      field: 'other',
      code: 'unknown_field',
    })
  })
})
