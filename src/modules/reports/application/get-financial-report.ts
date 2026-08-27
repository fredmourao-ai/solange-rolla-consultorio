import { getExpenseSummary, type Expense } from '../../payables/public'
import { getRevenueSummary, type RevenueReceivable, type RevenueRefund } from '../../receivables/public'

export type PaymentMethod = 'pix' | 'card' | 'cash' | 'transfer' | 'other'
export type FinancialReportInput = {
  payments: Array<{ amountCents: number; paidAt: string; method: PaymentMethod }>
  refunds: RevenueRefund[]
  receivables: RevenueReceivable[]
  expenses: Expense[]
}

function businessDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

export function getFinancialReport(input: FinancialReportInput, startDate: string, endDate: string) {
  const revenue = getRevenueSummary(input, startDate, endDate)
  const expenses = getExpenseSummary(input.expenses, startDate, endDate)
  const realizedCents = revenue.receivedCents - revenue.effectiveRefundsCents - expenses.paidCents
  const projectedCents = realizedCents + revenue.openReceivablesCents - revenue.pendingRefundsCents - expenses.upcomingCents
  const paymentMethodsCents = input.payments.filter((payment) => businessDate(payment.paidAt) >= startDate && businessDate(payment.paidAt) < endDate).reduce<Partial<Record<PaymentMethod, number>>>((totals, payment) => {
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
