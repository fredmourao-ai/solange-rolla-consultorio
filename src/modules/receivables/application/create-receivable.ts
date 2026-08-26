import { createReceivable, type Receivable, type ReceivableInput } from '../domain/receivable'
export type ReceivableRepository = { findByIdempotencyKey(key: string): Promise<Receivable | null>; insert(receivable: Receivable & { idempotencyKey: string }): Promise<Receivable> }
export async function createReceivableIdempotent(input: ReceivableInput, repository: ReceivableRepository): Promise<Receivable> {
  const existing = await repository.findByIdempotencyKey(input.idempotencyKey)
  return existing ?? repository.insert(createReceivable(input))
}
