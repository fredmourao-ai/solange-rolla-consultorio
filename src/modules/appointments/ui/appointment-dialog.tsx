import type { AppointmentCommand } from '../domain/status'

export type AppointmentDialogModel = {
  id: string
  patientName: string
  serviceName: string
  startsAt: string
  endsAt: string
  statusLabel: string
  cancellationDeadlineAt: string
  availableCommands: AppointmentCommand[]
  chargeable: boolean
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

const commandLabels: Record<AppointmentCommand, string> = {
  send_confirmation: 'Enviar confirmação',
  confirm: 'Confirmar',
  request_reschedule: 'Solicitar reagendamento',
  reschedule: 'Reagendar',
  cancel_in_time: 'Cancelar (no prazo)',
  cancel_late: 'Cancelar (fora do prazo)',
  complete: 'Marcar como realizada',
  mark_no_show: 'Marcar falta',
  cancel_by_provider: 'Cancelar pela profissional',
}

export function AppointmentDialog({ appointment, redirectTo, changeStatusAction, chargeAction }: {
  appointment: AppointmentDialogModel
  redirectTo: string
  changeStatusAction: (formData: FormData) => Promise<void>
  chargeAction: (formData: FormData) => Promise<void>
}) {
  return <section className="appointment-dialog" aria-label="Detalhes da consulta">
    <h3>{appointment.patientName}</h3>
    <p>{appointment.serviceName}</p>
    <p>
      <time dateTime={appointment.startsAt}>{dateTime.format(new Date(appointment.startsAt))}</time>
      {' até '}
      <time dateTime={appointment.endsAt}>{dateTime.format(new Date(appointment.endsAt))}</time>
    </p>
    <p>{appointment.statusLabel}</p>
    <p>
      <strong>Cancelamento sem cobrança até </strong>
      {dateTime.format(new Date(appointment.cancellationDeadlineAt))}
    </p>

    {appointment.availableCommands.length > 0 && (
      <form action={changeStatusAction} aria-label="Alterar status da consulta">
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <label>
          Alterar status
          <select name="command" defaultValue={appointment.availableCommands[0]}>
            {appointment.availableCommands.map((command) => (
              <option key={command} value={command}>{commandLabels[command]}</option>
            ))}
          </select>
        </label>
        <button type="submit">Aplicar</button>
      </form>
    )}

    {appointment.chargeable && (
      <form action={chargeAction} aria-label="Cobrar falta ou cancelamento fora do prazo">
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <button type="submit">Cobrar falta/cancelamento fora do prazo</button>
      </form>
    )}
  </section>
}
