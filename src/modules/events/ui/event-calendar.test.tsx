import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EventCalendar } from './event-calendar'

describe('EventCalendar', () => {
  it('renders operational event information', () => {
    const html = renderToStaticMarkup(<EventCalendar events={[{
      id: 'evt-1', title: 'Encontro Demonstração', startsAt: '2026-09-12T12:00:00.000Z',
      endsAt: '2026-09-12T15:00:00.000Z', modality: 'in_person', location: 'Espaço Demo',
      capacity: 12, registrationCount: 2, defaultPriceCents: 18000, status: 'open',
    }]} />)
    expect(html).toContain('Encontro Demonstração')
    expect(html).toContain('12/09/2026')
    expect(html).toContain('2 de 12 inscrições')
    expect(html).toContain('R$ 180,00')
    expect(html).toContain('Presencial')
  })
})
