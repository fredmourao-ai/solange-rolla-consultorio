import { describe, expect, it, vi } from 'vitest'
import { reconcileRecurringPayables } from './recurring-payables-scheduling'

const baseRule = {
  id: '11111111-1111-4111-8111-111111111111',
  vendorId: '22222222-2222-4222-8222-222222222222',
  categoryId: '33333333-3333-4333-8333-333333333333',
  description: 'Aluguel',
  amountCents: 250000,
  startDate: '2026-01-01',
  dayOfMonth: 10,
  monthEndFallback: 'last_day' as const,
}

describe('recurring payables scheduler', () => {
  it('materializes the current Sao Paulo competence with a stable idempotency key', async () => {
    const insertIfMissing = vi.fn(async () => true)
    await expect(reconcileRecurringPayables({
      now: new Date('2026-09-16T02:30:00.000Z'),
      rules: [baseRule],
      insertIfMissing,
    })).resolves.toEqual({ considered: 1, created: 1, skipped: 0 })
    expect(insertIfMissing).toHaveBeenCalledWith({
      vendorId: baseRule.vendorId,
      categoryId: baseRule.categoryId,
      recurrenceRuleId: baseRule.id,
      description: 'Aluguel',
      amountCents: 250000,
      dueDate: '2026-09-10',
      competence: '2026-09-01',
      idempotencyKey: `recurrence:${baseRule.id}:2026-09`,
    })
  })

  it('continues deterministically when one rule is not applicable in the month', async () => {
    const insertIfMissing = vi.fn(async () => true)
    const rejectRule = { ...baseRule, id: '44444444-4444-4444-8444-444444444444', dayOfMonth: 31, monthEndFallback: 'reject' as const }
    await expect(reconcileRecurringPayables({
      now: new Date('2026-02-15T12:00:00.000Z'),
      rules: [rejectRule, baseRule],
      insertIfMissing,
    })).resolves.toEqual({ considered: 2, created: 1, skipped: 1 })
    expect(insertIfMissing).toHaveBeenCalledTimes(1)
    expect(insertIfMissing).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: expect.stringContaining(baseRule.id) }))
  })

  it('does not materialize a payable whose due date is before the rule start date', async () => {
    const insertIfMissing = vi.fn(async () => true)
    await expect(reconcileRecurringPayables({
      now: new Date('2026-09-16T12:00:00Z'),
      rules: [{ ...baseRule, startDate: '2026-09-15', dayOfMonth: 10 }],
      insertIfMissing,
    })).resolves.toEqual({ considered: 1, created: 0, skipped: 1 })
    expect(insertIfMissing).not.toHaveBeenCalled()
  })

  it('does not count an existing idempotency key as a new payable', async () => {
    const insertIfMissing = vi.fn(async () => false)
    await expect(reconcileRecurringPayables({ now: new Date('2026-09-10T15:00:00Z'), rules: [baseRule], insertIfMissing }))
      .resolves.toEqual({ considered: 1, created: 0, skipped: 0 })
  })
})
