import { monthlyPayableFor, type RecurrenceRule } from '../domain/recurrence'
import { createPayableIdempotent, type PayableRepository } from './create-payable'

export type RecurringPayableInput = Omit<Parameters<typeof createPayableIdempotent>[0], 'dueDate' | 'competence' | 'idempotencyKey'>

export async function generateRecurringPayable(rule: RecurrenceRule, competence: string, input: RecurringPayableInput, repository: PayableRepository) {
  const occurrence = monthlyPayableFor(rule, competence)
  if (!occurrence) return null
  return createPayableIdempotent({ ...input, ...occurrence, competence }, repository)
}
