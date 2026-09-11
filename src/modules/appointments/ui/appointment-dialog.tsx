import Link from 'next/link'
import type { AppointmentCommand } from '../domain/status'

export type AppointmentDialogModel = {
  id: string
  personId: string
  patientName: string
  serviceName: string
  startsAt: string
  endsAt: string
  statusLabel: string
  cancellationDeadlineAt: string
  availableCommands: AppointmentCommand[]
  chargeable: boolean
  canOpenPatient: boolean
  canStartCare: boolean
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

const commandLabels: Record<AppointmentCommand, string> = {
  send_confirmation: 'Enviar confirmação',
  confirm: 'Confirmar consulta',
  check_in: 'Paciente chegou',
  start: 'Iniciar atendimento',
  request_reschedule: 'Solicitar reagendamento',
  reschedule: 'Reagendar',
  cancel_in_time: 'Cancelar no prazo',
  cancel_late: 'Cancelar fora do prazo',
  complete: 'Finalizar atendimento',
  mark_no_show: 'Registrar falta',
  cancel_by_provider: 'Cancelar pela profissional',
}

export function AppointmentDialog({ appointment, redirectTo, changeStatusAction, chargeAction }: {
  appointment: AppointmentDialogModel
  redirectTo: string
  changeStatusAction: (formData: FormData) => Promise<void>
  chargeAction: (formData: FormData) => Promise<void>
}) {
  const canStartHere = appointment.canStartCare && appointment.availableCommands.includes('start')
  const statusCommands = appointment.availableCommands.filter((command) => command !== 'start')

  return <section className="appointment-dialog" aria-label="Detalhes da consulta">
    <h3>{appointment.patientName}</h3>
    <p>{appointment.serviceName}</p>
    <p>
      <time dateTime={appointment.startsAt}>{dateTime.format(new Date(appointment.startsAt))}</time>
      {' até '}
      <time dateTime={appointment.endsAt}>{dateTime.format(new Date(appointment.endsAt))}</time>
    </p>
    <p><span className="status-badge">{appointment.statusLabel}</span></p>
    <p>
      <strong>Cancelamento sem cobrança até </strong>
      {dateTime.format(new Date(appointment.cancellationDeadlineAt))}
    </p>

    <div className="appointment-dialog__quick-actions">
      {appointment.canOpenPatient ? <Link className="ui-button ui-button--outline" href={`/pessoas/${appointment.personId}`}>Abrir paciente</Link> : null}
      {canStartHere ? <form action={changeStatusAction}>
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="command" value="start" />
        <button className="ui-button ui-button--primary" type="submit">Iniciar atendimento</button>
      </form> : null}
    </div>

    {statusCommands.length > 0 && (
      <form action={changeStatusAction} aria-label="Ações da consulta">
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <label className="form-field">
          <span className="form-field__label">Ação</span>
          <select className="ui-select" name="command" defaultValue={statusCommands[0]}>
            {statusCommands.map((command) => (
              <option key={command} value={command}>{commandLabels[command]}</option>
            ))}
          </select>
        </label>
        <button className="ui-button ui-button--primary" type="submit">Aplicar</button>
      </form>
    )}

    {appointment.chargeable && (
      <form action={chargeAction} aria-label="Cobrar falta ou cancelamento fora do prazo">
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <button className="ui-button ui-button--outline" type="submit">Registrar cobrança</button>
      </form>
    )}
  </section>
}
