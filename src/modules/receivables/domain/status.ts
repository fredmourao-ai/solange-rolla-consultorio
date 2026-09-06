export const RECEIVABLE_STATUSES = ['open', 'partial', 'paid', 'overdue', 'refund_due', 'refunded', 'voided'] as const
export type ReceivableStatus = (typeof RECEIVABLE_STATUSES)[number]

export function statusForBalance(balanceCents: number, paidCents: number, chargeCents: number): ReceivableStatus {
  if (chargeCents === 0) return paidCents > 0 ? 'refund_due' : 'voided'
  if (balanceCents === 0) return 'paid'
  return paidCents > 0 ? 'partial' : 'open'
}

export function deriveReceivableStatus(input: {
  chargeCents: number
  netPaidCents: number
  refundedCents: number
  currentStatus: ReceivableStatus
}): ReceivableStatus {
  if (input.currentStatus === 'voided') return 'voided'
  if (input.chargeCents <= 0) return input.netPaidCents > 0 ? 'refund_due' : 'voided'
  if (input.netPaidCents > input.chargeCents) return 'refund_due'
  if (input.netPaidCents === input.chargeCents) return 'paid'
  if (input.refundedCents > 0 && input.netPaidCents <= 0) return 'refunded'
  if (input.currentStatus === 'overdue') return 'overdue'
  return input.netPaidCents > 0 ? 'partial' : 'open'
}
