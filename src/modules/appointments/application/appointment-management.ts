import { saoPauloLocalToIso } from '../../../shared/kernel/time/sao-paulo'

export type AppointmentWindow = { startsAt: Date; endsAt: Date }
export type ExistingAppointmentWindow = { id: string; startsAt: string; endsAt: string; status: string }

const NON_BLOCKING_STATUSES = new Set(['cancelled_in_time', 'cancelled_late', 'cancelled_by_provider'])

export function parseSaoPauloLocalDateTime(value: string): Date {
  try {
    return new Date(saoPauloLocalToIso(value))
  } catch {
    throw new Error('INVALID_APPOINTMENT_LOCAL_TIME')
  }
}

export function appointmentWindow(startsAtLocal: string, durationMinutes: number): AppointmentWindow {
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) throw new Error('INVALID_SERVICE_DURATION')
  const startsAt = parseSaoPauloLocalDateTime(startsAtLocal)
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000)
  return { startsAt, endsAt }
}

export function hasAppointmentConflict(
  requested: AppointmentWindow,
  existing: readonly ExistingAppointmentWindow[],
  editingAppointmentId?: string,
): boolean {
  return existing.some((row) => {
    if (row.id === editingAppointmentId || NON_BLOCKING_STATUSES.has(row.status)) return false
    const startsAt = new Date(row.startsAt)
    const endsAt = new Date(row.endsAt)
    return startsAt < requested.endsAt && endsAt > requested.startsAt
  })
}

export function formatSaoPauloDateTimeLocal(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}
