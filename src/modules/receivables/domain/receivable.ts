import { statusForBalance, type ReceivableStatus } from './status'

export type Receivable = { id: string; sourceType: string; sourceId: string; personId: string; payerPersonId: string; originalAmountCents: number; adjustmentCents: number; paidCents: number; status?: ReceivableStatus }
export type ReceivableInput = { sourceType: string; sourceId: string; personId: string; payerPersonId: string; amountCents: number; idempotencyKey: string }

function assertCents(value: number): void { if (!Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_MONEY_AMOUNT') }
export function createReceivable(input: ReceivableInput): Receivable & { idempotencyKey: string; balanceCents: number } {
  assertCents(input.amountCents)
  const balanceCents = input.amountCents
  return { id: input.idempotencyKey, sourceType: input.sourceType, sourceId: input.sourceId, personId: input.personId, payerPersonId: input.payerPersonId, originalAmountCents: input.amountCents, adjustmentCents: 0, paidCents: 0, status: 'open', idempotencyKey: input.idempotencyKey, balanceCents }
}

export function applyPayment(receivable: Receivable, amountCents: number): Receivable & { balanceCents: number } {
  assertCents(amountCents)
  const chargeCents = Math.max(0, receivable.originalAmountCents + receivable.adjustmentCents)
  const balanceCents = chargeCents - receivable.paidCents
  if (amountCents > balanceCents) throw new Error('PAYMENT_EXCEEDS_BALANCE')
  const paidCents = receivable.paidCents + amountCents
  return { ...receivable, paidCents, balanceCents: chargeCents - paidCents, status: statusForBalance(chargeCents - paidCents, paidCents, chargeCents) }
}
