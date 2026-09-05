import { describe, expect, it } from 'vitest'
import { deriveReceivableStatus } from './status'

describe('deriveReceivableStatus', () => {
  it('keeps an unpaid overdue receivable overdue', () => {
    expect(deriveReceivableStatus({ chargeCents: 10000, netPaidCents: 0, refundedCents: 0, currentStatus: 'overdue' })).toBe('overdue')
  })

  it('marks a fully waived receivable voided when nothing was paid', () => {
    expect(deriveReceivableStatus({ chargeCents: 0, netPaidCents: 0, refundedCents: 0, currentStatus: 'open' })).toBe('voided')
  })

  it('marks overpaid or reduced-below-paid receivables as refund_due', () => {
    expect(deriveReceivableStatus({ chargeCents: 5000, netPaidCents: 7000, refundedCents: 0, currentStatus: 'paid' })).toBe('refund_due')
  })

  it('marks a fully refunded positive charge as refunded', () => {
    expect(deriveReceivableStatus({ chargeCents: 10000, netPaidCents: 0, refundedCents: 10000, currentStatus: 'paid' })).toBe('refunded')
  })
})
