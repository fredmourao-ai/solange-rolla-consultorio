import { describe, expect, it } from 'vitest'
import { monthlyPayableFor, recurrenceIdempotencyKey, type RecurrenceRule } from './recurrence'

const rule: RecurrenceRule = {
  id: 'rule-rent',
  startDate: '2026-09-01',
  dayOfMonth: 10,
  monthEndFallback: 'last_day',
}

describe('monthly payable recurrence', () => {
  it('generates one payable on the configured day and a stable idempotency key', () => {
    expect(monthlyPayableFor(rule, '2026-09')).toEqual({
      dueDate: '2026-09-10',
      idempotencyKey: 'recurrence:rule-rent:2026-09',
    })
    expect(monthlyPayableFor(rule, '2026-08')).toBeNull()
    expect(recurrenceIdempotencyKey(rule.id, '2026-09')).toBe('recurrence:rule-rent:2026-09')
  })

  it.each([
    ['2026-02', 29, '2026-02-28'],
    ['2026-04', 30, '2026-04-30'],
    ['2026-02', 31, '2026-02-28'],
  ] as const)('uses the last valid day for %s/%s', (competence, dayOfMonth, dueDate) => {
    expect(monthlyPayableFor({ ...rule, startDate: '2026-01-01', dayOfMonth }, competence)?.dueDate).toBe(dueDate)
  })

  it('skips a month when the configured day does not exist and policy is reject', () => {
    expect(monthlyPayableFor({ ...rule, startDate: '2026-01-01', dayOfMonth: 31, monthEndFallback: 'reject' }, '2026-02')).toBeNull()
  })
})
