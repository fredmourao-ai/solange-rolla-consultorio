import { describe, expect, it } from 'vitest'
import type { Payable } from '../modules/payables/public'
import { recurringPayableCompetence, scheduleRecurringPayables } from './payable-recurrence-scheduling'

describe('payable recurrence scheduling', () => {
  it('derives competence in America/Sao_Paulo at the UTC month boundary', () => {
    expect(recurringPayableCompetence(new Date('2026-10-01T02:30:00.000Z'))).toBe('2026-09')
    expect(recurringPayableCompetence(new Date('2026-10-01T03:30:00.000Z'))).toBe('2026-10')
  })

  it('materializes each rule once per competence using the deterministic idempotency key', async () => {
    const stored = new Map<string, Payable>()
    let inserts = 0
    const repository = {
      async findByIdempotencyKey(key: string) { return stored.get(key) ?? null },
      async insert(payable: Payable) {
        inserts += 1
        const created = { ...payable, id: `payable-${inserts}` }
        stored.set(created.idempotencyKey, created)
        return created
      },
    }
    const rule = {
      id: 'rule-1', vendorId: 'vendor-1', categoryId: 'category-1', description: 'Internet', amountCents: 12990,
      startDate: '2026-01-01', dayOfMonth: 31, monthEndFallback: 'last_day' as const,
    }
    const input = { now: new Date('2026-09-16T12:00:00.000Z'), loadActiveRules: async () => [rule], repositoryForRule: () => repository }

    expect(await scheduleRecurringPayables(input)).toEqual({ competence: '2026-09', rules: 1, processed: 1 })
    expect(await scheduleRecurringPayables(input)).toEqual({ competence: '2026-09', rules: 1, processed: 1 })
    expect(inserts).toBe(1)
    expect(stored.get('recurrence:rule-1:2026-09')).toMatchObject({ dueDate: '2026-09-30', amountCents: 12990, vendorId: 'vendor-1' })
  })

  it('does not create a payable before the recurrence start month', async () => {
    let inserts = 0
    const repository = {
      async findByIdempotencyKey() { return null },
      async insert(payable: Payable) { inserts += 1; return payable },
    }
    const result = await scheduleRecurringPayables({
      now: new Date('2026-09-16T12:00:00.000Z'),
      loadActiveRules: async () => [{
        id: 'rule-future', vendorId: 'vendor-1', categoryId: 'category-1', description: 'Future', amountCents: 1000,
        startDate: '2026-10-01', dayOfMonth: 5, monthEndFallback: 'last_day' as const,
      }],
      repositoryForRule: () => repository,
    })
    expect(result).toEqual({ competence: '2026-09', rules: 1, processed: 0 })
    expect(inserts).toBe(0)
  })
})
