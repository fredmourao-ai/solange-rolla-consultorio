import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppointmentCalendar } from './calendar'
import type { AppointmentCommand } from '../domain/status'

const noop = async () => {}

describe('AppointmentCalendar', () => {
  it('renders patient, service, reception action and cancellation deadline', () => {
    const html = renderToStaticMarkup(<AppointmentCalendar
      items={[{
        id: 'apt-1',
        personId: 'person-1',
        patientName: 'Paciente Demonstração',
        serviceName: 'Consulta individual',
        startsAt: '2026-08-31T18:00:00.000Z',
        endsAt: '2026-08-31T18:50:00.000Z',
        status: 'confirmed',
        cancellationDeadlineAt: '2026-08-27T18:00:00.000Z',
        availableCommands: ['check_in', 'mark_no_show', 'cancel_in_time'],
        chargeable: false,
        canOpenPatient: true,
        canStartCare: false,
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
    expect(html).toContain('Paciente chegou')
    expect(html).toContain('Abrir paciente')
  })

  it('renders the handoff state in plain language', () => {
    const html = renderToStaticMarkup(<AppointmentCalendar
      items={[{
        id: 'apt-2', personId: 'person-2', patientName: 'Ana', serviceName: 'Psicoterapia',
        startsAt: '2026-08-31T19:00:00.000Z', endsAt: '2026-08-31T19:50:00.000Z',
        status: 'checked_in', cancellationDeadlineAt: '2026-08-27T19:00:00.000Z',
        availableCommands: ['start'], chargeable: false, canOpenPatient: true, canStartCare: true,
      }]}
      redirectTo="/agenda" changeStatusAction={noop} chargeAction={noop}
    />)
    expect(html).toContain('Aguardando atendimento')
    expect(html).toContain('Iniciar atendimento')
  })

  it('only offers the charge action for an authorized chargeable case', () => {
    const base = {
      id: 'apt-1', personId: 'person-1', patientName: 'Paciente', serviceName: 'Consulta',
      startsAt: '2026-08-31T18:00:00.000Z', endsAt: '2026-08-31T18:50:00.000Z',
      cancellationDeadlineAt: '2026-08-27T18:00:00.000Z', availableCommands: [] as AppointmentCommand[],
      canOpenPatient: true, canStartCare: false,
    }
    const redirectTo = '/agenda?view=week&date=2026-08-31'
    const notChargeable = renderToStaticMarkup(<AppointmentCalendar
      items={[{ ...base, status: 'confirmed', chargeable: false }]}
      redirectTo={redirectTo} changeStatusAction={noop} chargeAction={noop}
    />)
    expect(notChargeable).not.toContain('Registrar cobrança')

    const chargeable = renderToStaticMarkup(<AppointmentCalendar
      items={[{ ...base, status: 'no_show', chargeable: true }]}
      redirectTo={redirectTo} changeStatusAction={noop} chargeAction={noop}
    />)
    expect(chargeable).toContain('Registrar cobrança')
  })
})
