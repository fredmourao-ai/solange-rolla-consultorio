import type { ReceivableInput } from '../domain/receivable'

export type ChargeableAppointment = {
  id: string
  status: 'no_show' | 'cancelled_late'
  personId: string
  payerPersonId: string
  noShowChargeEnabled: boolean
  lateCancellationChargeEnabled: boolean
}

/**
 * Charging is never automatic on an agenda status change (appointments'
 * own invariant: agenda state stays independent of financial state) --
 * this only shapes the ReceivableInput a staff-initiated charge action
 * passes to the existing createReceivableIdempotent. Returns null when the
 * policy snapshot in effect at booking time disabled a charge for this
 * outcome, so the UI can hide the charge action rather than offer a
 * no-op.
 */
export function buildAppointmentCharge(
  appointment: ChargeableAppointment,
  servicePriceCents: number,
): ReceivableInput | null {
  const enabled = appointment.status === 'no_show'
    ? appointment.noShowChargeEnabled
    : appointment.lateCancellationChargeEnabled
  if (!enabled) return null

  return {
    sourceType: 'appointment',
    sourceId: appointment.id,
    personId: appointment.personId,
    payerPersonId: appointment.payerPersonId,
    amountCents: servicePriceCents,
    idempotencyKey: `appointment:${appointment.id}:charge`,
  }
}
