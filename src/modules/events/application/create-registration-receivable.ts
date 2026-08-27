import { createReceivableIdempotent, type Receivable, type ReceivableRepository } from '../../receivables/public'

export async function createRegistrationReceivable(input: { registrationId: string; personId: string; payerPersonId: string; amountCents: number; repository: ReceivableRepository }): Promise<Receivable> {
  return createReceivableIdempotent({ sourceType: 'event_registration', sourceId: input.registrationId, personId: input.personId, payerPersonId: input.payerPersonId, amountCents: input.amountCents, idempotencyKey: `event-registration:${input.registrationId}` }, input.repository)
}
