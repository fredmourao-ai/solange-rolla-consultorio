import { getRevenueSummary, type RevenuePayment, type RevenueReceivable, type RevenueRefund } from '../../receivables/public'
import { getExpenseSummary, type Expense } from '../../payables/public'

export type CashflowInput = { payments: RevenuePayment[]; refunds: RevenueRefund[]; receivables: RevenueReceivable[]; expenses: Expense[] }
export type CashflowSnapshot = ReturnType<typeof getCashflowReadModel>

export function getCashflowReadModel(input: CashflowInput, startDate: string, endDate: string) {
  const revenue = getRevenueSummary(input, startDate, endDate)
  const expenses = getExpenseSummary(input.expenses, startDate, endDate)
  const realizedCents = revenue.receivedCents - revenue.effectiveRefundsCents - expenses.paidCents
  return {
    periodStart: startDate,
    periodEnd: endDate,
    ...revenue,
    paidExpensesCents: expenses.paidCents,
    upcomingExpensesCents: expenses.upcomingCents,
    realizedCents,
    projectedCents: realizedCents + revenue.openReceivablesCents - revenue.pendingRefundsCents - expenses.upcomingCents,
    projectionLabel: 'projection_not_official_accounting' as const,
  }
}
