// @ts-expect-error -- This synthetic alias is resolved by the fixture tsconfig only.
import { producerId } from '@test-modules/producer/internal'

export const value = producerId
