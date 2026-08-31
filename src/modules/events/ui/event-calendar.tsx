export type EventCalendarItem = {
  id: string
  title: string
  startsAt: string
  endsAt: string
  modality: string
  location: string | null
  capacity: number
  registrationCount: number
  defaultPriceCents: number
  status: string
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short', timeStyle: 'short',
})
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const modalityLabels: Record<string, string> = {
  in_person: 'Presencial', online: 'Online', hybrid: 'Híbrido',
}

export function EventCalendar({ events }: { events: EventCalendarItem[] }) {
  if (events.length === 0) return <p className="empty-state">Nenhum evento cadastrado.</p>
  return <ul className="event-calendar" aria-label="Agenda de eventos">
    {events.map((event) => <li key={event.id} className="event-calendar__item">
      <div><strong>{event.title}</strong><span>{modalityLabels[event.modality] ?? event.modality}</span></div>
      <div>
        <time dateTime={event.startsAt}>{dateTime.format(new Date(event.startsAt))}</time>
        <span> até {dateTime.format(new Date(event.endsAt))}</span>
      </div>
      <div>
        <span>{event.registrationCount} de {event.capacity} inscrições</span>
        <span>{money.format(event.defaultPriceCents / 100)}</span>
      </div>
      {event.location ? <small>{event.location}</small> : null}
    </li>)}
  </ul>
}
