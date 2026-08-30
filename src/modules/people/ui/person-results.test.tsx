import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PersonResults } from './person-results'

describe('PersonResults', () => {
  it('renders people and available contact data', () => {
    const html = renderToStaticMarkup(<PersonResults people={[{
      id: 'person-1', civilName: 'Ana Demonstração', preferredName: 'Ana',
      email: null, phone: null,
    }]} />)
    expect(html).toContain('Ana Demonstração')
    expect(html).toContain('Ana')
    expect(html).toContain('Contato não informado')
  })

  it('renders a useful empty state', () => {
    const html = renderToStaticMarkup(<PersonResults people={[]} />)
    expect(html).toContain('Nenhuma pessoa encontrada')
  })
})
