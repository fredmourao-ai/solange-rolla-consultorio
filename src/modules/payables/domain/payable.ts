export type PayableStatus = 'open' | 'partial' | 'paid' | 'voided'
export type Payable = {
  id: string
  vendorId: string
  categoryId: string
  description: string
  amountCents: number
  dueDate: string
  competence: string
  receiptPath: string | null
  status: PayableStatus
  paidCents: number
  idempotencyKey: string
}

export type PayableInput = Omit<Payable, 'id' | 'status' | 'paidCents'>

function assertCents(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('INVALID_MONEY_AMOUNT')
}

export function createPayable(input: PayableInput): Payable {
  assertCents(input.amountCents)
  if (!input.description.trim() || !input.dueDate || !input.competence) throw new Error('INVALID_PAYABLE')
  return { ...input, id: input.idempotencyKey, status: 'open', paidCents: 0 }
}

export function recordPayablePayment(payable: Payable, amountCents: number): Payable {
  assertCents(amountCents)
  if (amountCents > payable.amountCents - payable.paidCents) throw new Error('PAYMENT_EXCEEDS_BALANCE')
  const paidCents = payable.paidCents + amountCents
  return { ...payable, paidCents, status: paidCents === payable.amountCents ? 'paid' : 'partial' }
}
