export const RECEIVABLE_STATUSES = ['open', 'partial', 'paid', 'overdue', 'refund_due', 'refunded', 'voided'] as const
export type ReceivableStatus = (typeof RECEIVABLE_STATUSES)[number]

export function statusForBalance(balanceCents: number, paidCents: number, chargeCents: number): ReceivableStatus {
  if (chargeCents === 0) return paidCents > 0 ? 'refund_due' : 'voided'
  if (balanceCents === 0) return 'paid'
  return paidCents > 0 ? 'partial' : 'open'
}
