import { describe, expect, it } from 'vitest'
import { buildAppointmentCharge } from './build-appointment-charge'

const base = {
  id: 'appt-1', personId: 'p1', payerPersonId: 'p1',
  noShowChargeEnabled: true, lateCancellationChargeEnabled: true,
} as const

describe('buildAppointmentCharge', () => {
  it('charges the full service price for a no-show when the policy snapshot allows it', () => {
    expect(buildAppointmentCharge({ ...base, status: 'no_show' }, 30000)).toEqual({
      sourceType: 'appointment', sourceId: 'appt-1', personId: 'p1', payerPersonId: 'p1',
      amountCents: 30000, idempotencyKey: 'appointment:appt-1:charge',
    })
  })

  it('charges the full service price for a late cancellation when the policy snapshot allows it', () => {
    expect(buildAppointmentCharge({ ...base, status: 'cancelled_late' }, 25000)).toMatchObject({ amountCents: 25000 })
  })

  it('returns null when the no-show charge was disabled in the policy in effect at booking time', () => {
    expect(buildAppointmentCharge({ ...base, status: 'no_show', noShowChargeEnabled: false }, 30000)).toBeNull()
  })

  it('returns null when the late-cancellation charge was disabled in the policy in effect at booking time', () => {
    expect(buildAppointmentCharge({ ...base, status: 'cancelled_late', lateCancellationChargeEnabled: false }, 30000)).toBeNull()
  })

  it('bills a distinct financial-responsible payer separately from the patient', () => {
    const charge = buildAppointmentCharge({ ...base, status: 'no_show', personId: 'child-1', payerPersonId: 'guardian-1' }, 30000)
    expect(charge).toMatchObject({ personId: 'child-1', payerPersonId: 'guardian-1' })
  })
})
