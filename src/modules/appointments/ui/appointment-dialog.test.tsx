import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppointmentDialog } from './appointment-dialog'

describe('AppointmentDialog', () => {
  it('shows persisted appointment details and cancellation deadline', () => {
    const html = renderToStaticMarkup(<AppointmentDialog appointment={{
      patientName: 'Ana Demonstração',
      serviceName: 'Consulta individual',
      startsAt: '2026-08-31T18:00:00.000Z',
      endsAt: '2026-08-31T18:50:00.000Z',
      statusLabel: 'Confirmada',
      cancellationDeadlineAt: '2026-08-27T18:00:00.000Z',
    }} />)

    expect(html).toContain('Ana Demonstração')
    expect(html).toContain('Consulta individual')
    expect(html).toContain('Confirmada')
    expect(html).toContain('Cancelamento sem cobrança até')
    expect(html).toContain('27/08/2026')
  })
})
