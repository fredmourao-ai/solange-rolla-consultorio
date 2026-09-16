export type MonthEndFallback = 'last_day' | 'reject'

export type RecurrenceRule = {
  id: string
  startDate: string
  dayOfMonth: number
  monthEndFallback: MonthEndFallback
}

export type RecurrenceOccurrence = { dueDate: string; idempotencyKey: string }

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function recurrenceIdempotencyKey(ruleId: string, competence: string): string {
  return `recurrence:${ruleId}:${competence}`
}

export function monthlyPayableFor(rule: RecurrenceRule, competence: string): RecurrenceOccurrence | null {
  const [year, month] = competence.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('INVALID_COMPETENCE')
  if (competence < rule.startDate.slice(0, 7)) return null
  if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) throw new Error('INVALID_DAY_OF_MONTH')
  const lastDay = daysInMonth(year, month)
  if (rule.dayOfMonth > lastDay && rule.monthEndFallback === 'reject') return null
  if (rule.monthEndFallback !== 'last_day' && rule.monthEndFallback !== 'reject') throw new Error('INVALID_MONTH_END_FALLBACK')
  const day = Math.min(rule.dayOfMonth, lastDay)
  return { dueDate: `${competence}-${String(day).padStart(2, '0')}`, idempotencyKey: recurrenceIdempotencyKey(rule.id, competence) }
}
