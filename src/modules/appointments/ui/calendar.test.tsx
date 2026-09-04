import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppointmentCalendar } from './calendar'
import type { AppointmentCommand } from '../domain/status'

const noop = async () => {}

describe('AppointmentCalendar', () => {
  it('renders patient, service and persisted cancellation deadline', () => {
    const html = renderToStaticMarkup(<AppointmentCalendar
      items={[{
        id: 'apt-1',
        patientName: 'Paciente Demonstração',
        serviceName: 'Consulta individual',
        startsAt: '2026-08-31T18:00:00.000Z',
        endsAt: '2026-08-31T18:50:00.000Z',
        status: 'confirmed',
        cancellationDeadlineAt: '2026-08-27T18:00:00.000Z',
        availableCommands: ['complete', 'mark_no_show', 'cancel_in_time', 'cancel_late', 'cancel_by_provider', 'request_reschedule'],
        chargeable: false,
      }]}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(html).toContain('Paciente Demonstração')
    expect(html).toContain('Consulta individual')
    expect(html).toContain('Confirmada')
    expect(html).toContain('Cancelamento sem cobrança até')
    expect(html).toContain('27/08/2026')
    expect(html).toContain('Marcar falta')
  })

  it('only offers the charge action for a chargeable no-show or late cancellation', () => {
    const base = {
      id: 'apt-1', patientName: 'Paciente', serviceName: 'Consulta',
      startsAt: '2026-08-31T18:00:00.000Z', endsAt: '2026-08-31T18:50:00.000Z',
      cancellationDeadlineAt: '2026-08-27T18:00:00.000Z', availableCommands: [] as AppointmentCommand[],
    }
    const redirectTo = '/agenda?view=week&date=2026-08-31'
    const notChargeable = renderToStaticMarkup(<AppointmentCalendar
      items={[{ ...base, status: 'confirmed', chargeable: false }]}
      redirectTo={redirectTo} changeStatusAction={noop} chargeAction={noop}
    />)
    expect(notChargeable).not.toContain('Cobrar falta')

    const chargeable = renderToStaticMarkup(<AppointmentCalendar
      items={[{ ...base, status: 'no_show', chargeable: true }]}
      redirectTo={redirectTo} changeStatusAction={noop} chargeAction={noop}
    />)
    expect(chargeable).toContain('Cobrar falta')
  })
})
