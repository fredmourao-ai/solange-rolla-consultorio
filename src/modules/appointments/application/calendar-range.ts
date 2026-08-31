export type CalendarView = 'day' | 'week' | 'month'

const BUSINESS_TIMEZONE = 'America/Sao_Paulo'

function parseDateOnly(value: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('INVALID_CALENDAR_DATE')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) throw new Error('INVALID_CALENDAR_DATE')
  return [year, month, day]
}

function dateOnly(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function addDays(value: string, days: number): string {
  const [year, month, day] = parseDateOnly(value)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return dateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}
function zonedMidnight(value: string): Date {
  const [year, month, day] = parseDateOnly(value)
  const targetMs = Date.UTC(year, month - 1, day)
  let guessMs = targetMs
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  })
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guessMs))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]))
    const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    guessMs -= localAsUtc - targetMs
  }
  return new Date(guessMs)
}

function mondayOf(value: string): string {
  const [year, month, day] = parseDateOnly(value)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return addDays(value, -(weekday === 0 ? 6 : weekday - 1))
}
export function calendarRange(view: CalendarView, anchorDate: string): { from: Date; to: Date } {
  if (view === 'day') {
    return { from: zonedMidnight(anchorDate), to: zonedMidnight(addDays(anchorDate, 1)) }
  }
  if (view === 'week') {
    const start = mondayOf(anchorDate)
    return { from: zonedMidnight(start), to: zonedMidnight(addDays(start, 7)) }
  }
  if (view === 'month') {
    const [year, month] = parseDateOnly(anchorDate)
    const start = dateOnly(year, month, 1)
    const next = new Date(Date.UTC(year, month, 1))
    const end = dateOnly(next.getUTCFullYear(), next.getUTCMonth() + 1, 1)
    return { from: zonedMidnight(start), to: zonedMidnight(end) }
  }
  throw new Error('INVALID_CALENDAR_VIEW')
}
