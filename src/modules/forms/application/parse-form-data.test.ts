import { describe, expect, it } from 'vitest'
import { parseFormDataAnswers } from './parse-form-data'

const template = {
  id: 'tpl-v1', version: 1, classification: 'sensitive' as const,
  fields: [
    { key: 'name', type: 'short_text' as const, required: true, label: 'Nome' },
    { key: 'topics', type: 'multi_choice' as const, required: false, label: 'Temas', options: ['Família', 'Trabalho'] },
    { key: 'consent', type: 'boolean' as const, required: true, label: 'Concordo' },
    { key: 'declaration', type: 'declaration' as const, required: true, label: 'Declaro' },
  ],
}

describe('parse form data answers', () => {
  it('converts browser form values into schema-typed answers', () => {
    const data = new FormData()
    data.set('name', ' Pessoa Sintética ')
    data.append('topics', 'Família')
    data.append('topics', 'Trabalho')
    data.set('consent', 'true')
    data.set('declaration', 'true')

    expect(parseFormDataAnswers(template, data)).toEqual({
      name: 'Pessoa Sintética', topics: ['Família', 'Trabalho'], consent: true, declaration: true,
    })
  })
})
