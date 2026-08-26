import type { Receivable } from '../domain/receivable'
export async function applyAdjustment(input: { receivable: Receivable; adjustmentCents: number; reason: string; actorId: string }, repository: { append: (input: { receivableId: string; adjustmentCents: number; reason: string; actorId: string }) => Promise<Receivable> }): Promise<Receivable> {
  if (!Number.isSafeInteger(input.adjustmentCents) || !input.reason.trim() || !input.actorId) throw new Error('ADJUSTMENT_REASON_AND_ACTOR_REQUIRED')
  return repository.append({ receivableId: input.receivable.id, adjustmentCents: input.adjustmentCents, reason: input.reason, actorId: input.actorId })
}
