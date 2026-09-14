import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PersonResults } from './person-results'

describe('PersonResults', () => {
  it('renders patients and available contact data', () => {
    const html = renderToStaticMarkup(<PersonResults people={[{
      id: 'person-1', civilName: 'Ana Demonstração', preferredName: 'Ana',
      cpf: null, email: null, phone: null,
    }]} />)
    expect(html).toContain('Ana Demonstração')
    expect(html).toContain('Ana')
    expect(html).toContain('Contato não informado')
  })

  it('renders a useful empty state', () => {
    const html = renderToStaticMarkup(<PersonResults people={[]} />)
    expect(html).toContain('Nenhum paciente encontrado.')
  })
})

it('shows the contextual clinical action only when explicitly allowed', () => {
  const person = {
    id: 'person-1', civilName: 'Ana Demonstração', preferredName: 'Ana',
    cpf: null, email: null, phone: null,
  }
  const allowed = renderToStaticMarkup(<PersonResults people={[person]} canAccessClinical />)
  const denied = renderToStaticMarkup(<PersonResults people={[person]} />)

  expect(allowed).toContain('href="/clinico/person-1"')
  expect(allowed).toContain('Prontuário')
  expect(denied).not.toContain('/clinico/person-1')
})
