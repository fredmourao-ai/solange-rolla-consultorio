// @ts-expect-error -- Deliberately unresolved to prove the checker fails closed.
import { missing } from '@producer/missing'

export const unresolvedProducerImport = missing
