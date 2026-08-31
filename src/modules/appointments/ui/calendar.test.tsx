import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppointmentCalendar } from './calendar'

describe('AppointmentCalendar', () => {
  it('renders patient, service and persisted cancellation deadline', () => {
    const html = renderToStaticMarkup(<AppointmentCalendar items={[{
      id: 'apt-1',
      patientName: 'Paciente Demonstração',
      serviceName: 'Consulta individual',
      startsAt: '2026-08-31T18:00:00.000Z',
      endsAt: '2026-08-31T18:50:00.000Z',
      status: 'confirmed',
      cancellationDeadlineAt: '2026-08-27T18:00:00.000Z',
    }]} />)
    expect(html).toContain('Paciente Demonstração')
    expect(html).toContain('Consulta individual')
    expect(html).toContain('Confirmada')
    expect(html).toContain('Cancelamento sem cobrança até')
    expect(html).toContain('27/08/2026')
  })
})
