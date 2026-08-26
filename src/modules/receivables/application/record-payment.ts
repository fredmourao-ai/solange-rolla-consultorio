import { recordPayment, type Payment, type PaymentMethod } from '../domain/payment'
export type PaymentRepository = { findByIdempotencyKey(key: string): Promise<Payment | null>; insert(payment: Payment): Promise<Payment> }
export async function recordPaymentIdempotent(input: { id: string; receivableId: string; amountCents: number; method: PaymentMethod; idempotencyKey: string }, repository: PaymentRepository): Promise<Payment> { return (await repository.findByIdempotencyKey(input.idempotencyKey)) ?? repository.insert(recordPayment(input)) }
