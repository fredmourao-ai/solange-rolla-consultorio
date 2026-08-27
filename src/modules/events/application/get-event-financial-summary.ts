export type EventFinancialInput = {
  capacity: number
  registrations: Array<{ priceCents: number; status: 'confirmed' | 'pending_payment' | 'waitlisted' | 'cancelled' }>
  payments: Array<{ amountCents: number }>
  refunds: Array<{ amountCents: number; status: 'effective' | 'pending' }>
  expenses: Array<{ amountCents: number }>
}

export function getEventFinancialSummary(input: EventFinancialInput) {
  const active = input.registrations.filter((registration) => registration.status !== 'cancelled' && registration.status !== 'waitlisted')
  const potentialRevenueCents = active.reduce((total, registration) => total + registration.priceCents, 0)
  const receivedNetCents = input.payments.reduce((total, payment) => total + payment.amountCents, 0) - input.refunds.filter((refund) => refund.status === 'effective').reduce((total, refund) => total + refund.amountCents, 0)
  const pendingRefundsCents = input.refunds.filter((refund) => refund.status === 'pending').reduce((total, refund) => total + refund.amountCents, 0)
  const expensesCents = input.expenses.reduce((total, expense) => total + expense.amountCents, 0)
  return { capacity: input.capacity, confirmedRegistrations: active.length, potentialRevenueCents, receivedNetCents, receivableCents: Math.max(0, potentialRevenueCents - receivedNetCents), pendingRefundsCents, expensesCents, resultCents: receivedNetCents - expensesCents }
}
