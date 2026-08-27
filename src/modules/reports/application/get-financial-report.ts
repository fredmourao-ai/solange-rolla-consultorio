import { getExpenseSummary, type Expense } from '../../payables/public'
import { getRevenueSummary, type RevenueReceivable, type RevenueRefund } from '../../receivables/public'

export type PaymentMethod = 'pix' | 'card' | 'cash' | 'transfer' | 'other'
export type FinancialReportInput = {
  payments: Array<{ amountCents: number; paidAt: string; method: PaymentMethod }>
  refunds: RevenueRefund[]
  receivables: RevenueReceivable[]
  expenses: Expense[]
}

export function getFinancialReport(input: FinancialReportInput, startDate: string, endDate: string) {
  const revenue = getRevenueSummary(input, startDate, endDate)
  const expenses = getExpenseSummary(input.expenses, startDate, endDate)
  const realizedCents = revenue.receivedCents - revenue.effectiveRefundsCents - expenses.paidCents
  const projectedCents = realizedCents + revenue.openReceivablesCents - revenue.pendingRefundsCents - expenses.upcomingCents
  const paymentMethodsCents = input.payments.reduce<Partial<Record<PaymentMethod, number>>>((totals, payment) => {
    totals[payment.method] = (totals[payment.method] ?? 0) + payment.amountCents
    return totals
  }, {})

  return {
    periodStart: startDate,
    periodEnd: endDate,
    ...revenue,
    paidExpensesCents: expenses.paidCents,
    upcomingExpensesCents: expenses.upcomingCents,
    realizedCents,
    projectedCents,
    paymentMethodsCents,
    totals: { realizedCents, projectedCents },
  }
}
