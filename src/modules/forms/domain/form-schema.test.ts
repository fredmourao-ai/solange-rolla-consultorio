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

  it('accepts valid answers and rejects unknown fields', () => {
    expect(validateAnswers(schema, { full_name: 'Pessoa Sintética', consent: true })).toEqual([])
    expect(validateAnswers(schema, { full_name: 'Pessoa Sintética', other: 'x' })).toContainEqual({
      field: 'other',
      code: 'unknown_field',
    })
  })
})
