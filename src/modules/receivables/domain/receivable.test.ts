import { describe, expect, it } from 'vitest'
import { applyPayment, createReceivable, type Receivable } from './receivable'

const base: Receivable = { id: 'r1', sourceType: 'appointment', sourceId: 'a1', personId: 'p1', payerPersonId: 'p2', originalAmountCents: 30000, adjustmentCents: 0, paidCents: 0 }

describe('receivable', () => {
  it('does not allow payment above the current charge', () => {
    expect(() => applyPayment(base, 40000)).toThrow('PAYMENT_EXCEEDS_BALANCE')
  })
  it('calculates partial and paid balances using integer cents', () => {
    expect(applyPayment(base, 10000)).toMatchObject({ paidCents: 10000, balanceCents: 20000, status: 'partial' })
    expect(applyPayment(base, 30000)).toMatchObject({ paidCents: 30000, balanceCents: 0, status: 'paid' })
  })
  it('creates a receivable with patient and payer separated', () => {
    expect(createReceivable({ sourceType: 'event', sourceId: 'e1', personId: 'p1', payerPersonId: 'p2', amountCents: 5000, idempotencyKey: 'event:e1' })).toMatchObject({ personId: 'p1', payerPersonId: 'p2', originalAmountCents: 5000 })
  })
})
