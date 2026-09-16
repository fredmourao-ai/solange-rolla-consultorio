import { monthlyPayableFor, type MonthEndFallback } from '../modules/payables/domain/recurrence'

export type ActiveRecurrenceRule = {
  id: string
  vendorId: string
  categoryId: string
  description: string
  amountCents: number
  startDate: string
  dayOfMonth: number
  monthEndFallback: MonthEndFallback
}

export type RecurringPayableRow = {
  vendorId: string
  categoryId: string
  recurrenceRuleId: string
  description: string
  amountCents: number
  dueDate: string
  competence: string
  idempotencyKey: string
}

type ReconcileInput = {
  now: Date
  rules: ActiveRecurrenceRule[]
  insertIfMissing: (row: RecurringPayableRow) => Promise<boolean>
}

function saoPauloCompetence(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) throw new Error('RECURRENCE_COMPETENCE_UNAVAILABLE')
  return `${year}-${month}`
}

export async function reconcileRecurringPayables(input: ReconcileInput) {
  const competence = saoPauloCompetence(input.now)
  let created = 0
  let skipped = 0
  for (const rule of [...input.rules].sort((a, b) => a.id.localeCompare(b.id))) {
    const occurrence = monthlyPayableFor(rule, competence)
    if (!occurrence) {
      skipped += 1
      continue
    }
    const inserted = await input.insertIfMissing({
      vendorId: rule.vendorId,
      categoryId: rule.categoryId,
      recurrenceRuleId: rule.id,
      description: rule.description,
      amountCents: rule.amountCents,
      dueDate: occurrence.dueDate,
      competence: `${competence}-01`,
      idempotencyKey: occurrence.idempotencyKey,
    })
    if (inserted) created += 1
  }
  return { considered: input.rules.length, created, skipped }
}
