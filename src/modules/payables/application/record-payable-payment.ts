import { recordPayablePayment, type Payable } from '../domain/payable'

export type PayablePayment = { payableId: string; amountCents: number; paidAt: string; method: string; receiptPath: string | null; idempotencyKey: string }
export type PayablePaymentRepository = { findByIdempotencyKey(key: string): Promise<PayablePayment | null>; insert(payment: PayablePayment): Promise<PayablePayment>; updatePayable(payable: Payable): Promise<Payable> }

export async function recordPayablePaymentIdempotent(payable: Payable, input: Omit<PayablePayment, 'payableId'>, repository: PayablePaymentRepository) {
  const existing = await repository.findByIdempotencyKey(input.idempotencyKey)
  if (existing) return { payment: existing, payable }
  const next = recordPayablePayment(payable, input.amountCents)
  const payment = await repository.insert({ ...input, payableId: payable.id })
  return { payment, payable: await repository.updatePayable(next) }
}
