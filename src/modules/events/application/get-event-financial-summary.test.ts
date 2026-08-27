import { describe, expect, it } from 'vitest'
import { getEventFinancialSummary, type EventFinancialInput } from './get-event-financial-summary'

const input: EventFinancialInput = {
  capacity: 20,
  registrations: [
    { priceCents: 100000, status: 'confirmed' },
    { priceCents: 100000, status: 'confirmed' },
    { priceCents: 0, status: 'confirmed' },
    { priceCents: 100000, status: 'cancelled' },
  ],
  payments: [{ amountCents: 100000 }],
  refunds: [{ amountCents: 20000, status: 'effective' }, { amountCents: 10000, status: 'pending' }],
  expenses: [{ amountCents: 30000 }],
}

describe('event financial summary', () => {
  it('derives occupancy and financial totals without duplicating financial records', () => {
    expect(getEventFinancialSummary(input)).toEqual({
      capacity: 20,
      confirmedRegistrations: 3,
      potentialRevenueCents: 200000,
      receivedNetCents: 80000,
      receivableCents: 120000,
      pendingRefundsCents: 10000,
      expensesCents: 30000,
      resultCents: 50000,
    })
  })
})
