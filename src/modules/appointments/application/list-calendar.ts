import type { Appointment } from '../domain/appointment'

export type CalendarRepository = {
  list(from: Date, to: Date): Promise<Appointment[]>
}

export function listCalendar(repository: CalendarRepository, from: Date, to: Date) {
  if (to <= from) throw new Error('INVALID_CALENDAR_RANGE')
  return repository.list(from, to)
}
