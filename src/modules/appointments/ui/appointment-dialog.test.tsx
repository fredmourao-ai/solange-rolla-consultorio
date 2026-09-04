import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppointmentDialog } from './appointment-dialog'

const noop = async () => {}
const base = {
  id: 'apt-1',
  patientName: 'Ana Demonstração',
  serviceName: 'Consulta individual',
  startsAt: '2026-08-31T18:00:00.000Z',
  endsAt: '2026-08-31T18:50:00.000Z',
  statusLabel: 'Confirmada',
  cancellationDeadlineAt: '2026-08-27T18:00:00.000Z',
}

describe('AppointmentDialog', () => {
  it('shows persisted appointment details and cancellation deadline', () => {
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
  })

  it('offers a status-change form carrying the appointment id when commands are available', () => {
    const html = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: ['mark_no_show', 'complete'], chargeable: false }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(html).toContain('name="appointment_id" value="apt-1"')
    expect(html).toContain('Marcar falta')
    expect(html).toContain('Marcar como realizada')
  })

  it('hides the status-change form once the appointment reaches a terminal status', () => {
    const html = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: [], chargeable: true }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(html).not.toContain('Alterar status')
  })

  it('offers the charge action only when chargeable', () => {
    const chargeableHtml = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: [], chargeable: true }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(chargeableHtml).toContain('Cobrar falta/cancelamento fora do prazo')

    const notChargeableHtml = renderToStaticMarkup(<AppointmentDialog
      appointment={{ ...base, availableCommands: [], chargeable: false }}
      redirectTo="/agenda?view=week&date=2026-08-31"
      changeStatusAction={noop}
      chargeAction={noop}
    />)
    expect(notChargeableHtml).not.toContain('Cobrar falta/cancelamento fora do prazo')
  })
})
