import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppointmentDialog } from './appointment-dialog'

const noop = async () => {}
const base = {
  id: 'apt-1',
  personId: 'person-1',
  patientName: 'Ana Demonstração',
  serviceName: 'Consulta individual',
  startsAt: '2026-08-31T18:00:00.000Z',
  endsAt: '2026-08-31T18:50:00.000Z',
  statusLabel: 'Confirmada',
  cancellationDeadlineAt: '2026-08-27T18:00:00.000Z',
  canOpenPatient: true,
  canStartCare: false,
}

describe('AppointmentDialog', () => {
  it('shows persisted appointment details and patient shortcut', () => {
    const html = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: ['mark_no_show'], chargeable: false }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)

    expect(html).toContain('Ana Demonstração')
    expect(html).toContain('Consulta individual')
    expect(html).toContain('Confirmada')
    expect(html).toContain('Cancelamento sem cobrança até')
    expect(html).toContain('27/08/2026')
    expect(html).toContain('href="/pessoas/person-1"')
    expect(html).toContain('Abrir paciente')
  })

  it('uses human action names for operational commands', () => {
    const html = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: ['check_in', 'mark_no_show'], chargeable: false }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(html).toContain('name="appointment_id" value="apt-1"')
    expect(html).toContain('Paciente chegou')
    expect(html).toContain('Registrar falta')
    expect(html).toContain('value="mark_no_show">Registrar falta</option>')
    expect(html).not.toContain('>mark_no_show<')
  })

  it('routes a checked-in patient into the contextual care workspace', () => {
    const html = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: ['start'], chargeable: false, canStartCare: true }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(html).toContain('Iniciar atendimento')
    expect(html).toContain('href="/atendimentos/apt-1"')
    expect(html).not.toContain('ID do atendimento')
    expect(html).not.toContain('name="command"')
  })

  it('offers the charge action only when authorized and chargeable', () => {
    const chargeableHtml = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: [], chargeable: true }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(chargeableHtml).toContain('Registrar cobrança')

    const notChargeableHtml = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: [], chargeable: false }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(notChargeableHtml).not.toContain('Registrar cobrança')
  })
})
