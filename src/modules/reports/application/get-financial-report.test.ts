import { describe, expect, it } from 'vitest'
import { getFinancialReport, type FinancialReportInput } from './get-financial-report'

const fixture: FinancialReportInput = {
  payments: [
    { amountCents: 100000, paidAt: '2026-09-10T12:00:00Z', method: 'pix' },
    { amountCents: 50000, paidAt: '2026-09-11T12:00:00Z', method: 'card' },
    { amountCents: 999, paidAt: '2026-10-05T12:00:00Z', method: 'pix' },
  ],
  refunds: [{ amountCents: 10000, refundedAt: '2026-09-12T12:00:00Z', status: 'effective' }],
  receivables: [
    { amountCents: 30000, status: 'open' },
    { amountCents: 5000, status: 'overdue' },
  ],
  expenses: [
    { amountCents: 20000, paidAt: '2026-09-10T12:00:00Z', dueDate: '2026-09-10' },
    { amountCents: 8000, dueDate: '2026-10-10' },
  ],
}

describe('financial report', () => {
  it('derives every total from cent-based transactions', () => {
    expect(getFinancialReport(fixture, '2026-09-01', '2026-10-01')).toMatchObject({
      receivedCents: 150000,
      effectiveRefundsCents: 10000,
      openReceivablesCents: 30000,
      overdueReceivablesCents: 5000,
      paidExpensesCents: 20000,
      upcomingExpensesCents: 8000,
      realizedCents: 120000,
      projectedCents: 142000,
      paymentMethodsCents: { pix: 100000, card: 50000 },
    })
  })

  it('uses the same snapshot totals that an export receives', () => {
    const report = getFinancialReport(fixture, '2026-09-01', '2026-10-01')
    expect(report.totals.realizedCents).toBe(report.realizedCents)
    expect(report.totals.projectedCents).toBe(report.projectedCents)
  })
})
