export type AppointmentDialogModel = {
  patientName: string
  serviceName: string
  startsAt: string
  endsAt: string
  statusLabel: string
  cancellationDeadlineAt: string
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
})

export function AppointmentDialog({ appointment }: {
  appointment: AppointmentDialogModel
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
  </section>
}
