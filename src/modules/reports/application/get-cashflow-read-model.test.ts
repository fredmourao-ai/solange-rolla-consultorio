import { describe, expect, it } from 'vitest'
import { getCashflowReadModel, type CashflowInput } from './get-cashflow-read-model'

const fixture: CashflowInput = {
  payments: [{ amountCents: 1285000, paidAt: '2026-09-30T23:00:00Z' }],
  refunds: [
    { amountCents: 50000, refundedAt: '2026-09-30T23:30:00Z', status: 'effective' },
  ],
  receivables: [{ amountCents: 240000, status: 'open' }],
  expenses: [
    { amountCents: 415000, paidAt: '2026-09-30T20:00:00Z', dueDate: '2026-09-30' },
    { amountCents: 123000, dueDate: '2026-10-10' },
  ],
}

describe('cashflow read model', () => {
  it('keeps the synthetic cent totals exact and labels projection', () => {
    expect(getCashflowReadModel(fixture, '2026-09-01', '2026-10-01')).toMatchObject({
      receivedCents: 1285000,
      effectiveRefundsCents: 50000,
      openReceivablesCents: 240000,
      paidExpensesCents: 415000,
      upcomingExpensesCents: 123000,
      realizedCents: 820000,
      projectedCents: 937000,
      projectionLabel: 'projection_not_official_accounting',
    })
  })

  it('classifies a midnight UTC transaction by its local business date', () => {
    const input: CashflowInput = {
      payments: [{ amountCents: 100, paidAt: '2026-10-01T00:30:00Z' }],
      refunds: [],
      receivables: [],
      expenses: [],
    }
    expect(getCashflowReadModel(input, '2026-09-01', '2026-10-01').receivedCents).toBe(100)
  })
})
