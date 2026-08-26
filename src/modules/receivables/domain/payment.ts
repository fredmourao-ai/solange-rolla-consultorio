export const PAYMENT_METHODS = ['pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type Payment = { id: string; receivableId: string; amountCents: number; method: PaymentMethod; idempotencyKey: string; refundedCents: number; remainingCents: number }

export function recordPayment(input: { id: string; receivableId: string; amountCents: number; method: PaymentMethod; idempotencyKey: string }): Payment {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error('INVALID_PAYMENT_AMOUNT')
  return { ...input, refundedCents: 0, remainingCents: input.amountCents }
}
export function applyRefund(payment: Payment, amountCents: number): Payment {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > payment.remainingCents) throw new Error('REFUND_EXCEEDS_PAYMENT')
  return { ...payment, refundedCents: payment.refundedCents + amountCents, remainingCents: payment.remainingCents - amountCents }
}
