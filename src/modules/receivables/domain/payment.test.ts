import { describe, expect, it } from 'vitest'
import { applyRefund, recordPayment } from './payment'

describe('payments and refunds', () => {
  it('supports partial payments and rejects over-refund', () => {
    const payment = recordPayment({ id: 'pay-1', receivableId: 'r1', amountCents: 30000, method: 'pix', idempotencyKey: 'pay:r1:1' })
    expect(payment.remainingCents).toBe(30000)
    expect(applyRefund(payment, 10000)).toMatchObject({ refundedCents: 10000, remainingCents: 20000 })
    expect(() => applyRefund(payment, 40000)).toThrow('REFUND_EXCEEDS_PAYMENT')
  })
})
