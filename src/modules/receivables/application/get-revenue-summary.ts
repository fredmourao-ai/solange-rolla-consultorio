export type RevenuePayment = { amountCents: number; paidAt: string }
export type RevenueRefund = { amountCents: number; refundedAt: string; status: 'effective' | 'pending' }
export type RevenueReceivable = { amountCents: number; status: 'open' | 'overdue' }
export type RevenueSummary = { receivedCents: number; effectiveRefundsCents: number; pendingRefundsCents: number; openReceivablesCents: number; overdueReceivablesCents: number }

function businessDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`
}

function inPeriod(value: string, startDate: string, endDate: string): boolean {
  const date = businessDate(value)
  return date >= startDate && date < endDate
}

export function getRevenueSummary(input: { payments: RevenuePayment[]; refunds: RevenueRefund[]; receivables: RevenueReceivable[] }, startDate: string, endDate: string): RevenueSummary {
  return {
    receivedCents: input.payments.filter((item) => inPeriod(item.paidAt, startDate, endDate)).reduce((total, item) => total + item.amountCents, 0),
    effectiveRefundsCents: input.refunds.filter((item) => item.status === 'effective' && inPeriod(item.refundedAt, startDate, endDate)).reduce((total, item) => total + item.amountCents, 0),
    pendingRefundsCents: input.refunds.filter((item) => item.status === 'pending').reduce((total, item) => total + item.amountCents, 0),
    openReceivablesCents: input.receivables.filter((item) => item.status === 'open').reduce((total, item) => total + item.amountCents, 0),
    overdueReceivablesCents: input.receivables.filter((item) => item.status === 'overdue').reduce((total, item) => total + item.amountCents, 0),
  }
}
