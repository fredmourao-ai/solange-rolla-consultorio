import { AppointmentDialog } from './appointment-dialog'
import type { AppointmentCommand, AppointmentStatus } from '../domain/status'

export type AppointmentCalendarItem = {
  id: string
  personId: string
  patientName: string
  serviceName: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  cancellationDeadlineAt: string
  availableCommands: AppointmentCommand[]
  chargeable: boolean
  canOpenPatient: boolean
  canStartCare: boolean
}

const statusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  pending_confirmation: 'Aguardando confirmação',
  confirmed: 'Confirmada',
  checked_in: 'Aguardando atendimento',
  in_progress: 'Em atendimento',
  reschedule_requested: 'Reagendamento solicitado',
  rescheduled: 'Reagendada',
  cancelled_in_time: 'Cancelada no prazo',
  cancelled_late: 'Cancelada fora do prazo',
  completed: 'Realizada',
  no_show: 'Faltou',
  cancelled_by_provider: 'Cancelada pela profissional',
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

export function AppointmentCalendar({ items, redirectTo, changeStatusAction, chargeAction }: {
  items: AppointmentCalendarItem[]
  redirectTo: string
  changeStatusAction: (formData: FormData) => Promise<void>
  chargeAction: (formData: FormData) => Promise<void>
}) {
  if (items.length === 0) return <p className="empty-state">Nenhuma consulta neste período. Use “Nova consulta” para agendar.</p>

  return <ul className="appointment-calendar" aria-label="Agenda de consultas">
    {items.map((item) => (
      <li key={item.id} className="appointment-calendar__item" data-appointment-id={item.id}>
        <div>
          <strong>{item.patientName}</strong>
          <span>{item.serviceName}</span>
        </div>
        <div>
          <time dateTime={item.startsAt}>{dateTime.format(new Date(item.startsAt))}</time>
          <span> até {dateTime.format(new Date(item.endsAt))}</span>
        </div>
        <div>
          <span className="status-badge">{statusLabels[item.status] ?? 'Situação atual'}</span>
          <small>Cancelamento sem cobrança até {dateTime.format(new Date(item.cancellationDeadlineAt))}</small>
        </div>
        <details>
          <summary>Abrir consulta</summary>
          <AppointmentDialog
            appointment={{
              id: item.id,
              personId: item.personId,
              patientName: item.patientName,
              serviceName: item.serviceName,
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              statusLabel: statusLabels[item.status] ?? 'Situação atual',
              cancellationDeadlineAt: item.cancellationDeadlineAt,
              availableCommands: item.availableCommands,
              chargeable: item.chargeable,
              canOpenPatient: item.canOpenPatient,
              canStartCare: item.canStartCare,
            }}
            redirectTo={redirectTo}
            changeStatusAction={changeStatusAction}
            chargeAction={chargeAction}
          />
        </details>
      </li>
    ))}
  </ul>
}
