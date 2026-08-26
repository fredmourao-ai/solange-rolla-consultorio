import { createHash } from 'node:crypto'
import { canonicalize } from './canonicalize'

export function hashCanonical(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex')
}
