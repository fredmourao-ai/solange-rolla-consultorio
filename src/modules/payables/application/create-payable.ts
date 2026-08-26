import { createPayable, type Payable, type PayableInput } from '../domain/payable'

export type PayableRepository = { findByIdempotencyKey(key: string): Promise<Payable | null>; insert(payable: Payable): Promise<Payable> }

export async function createPayableIdempotent(input: PayableInput, repository: PayableRepository): Promise<Payable> {
  return (await repository.findByIdempotencyKey(input.idempotencyKey)) ?? repository.insert(createPayable(input))
}
