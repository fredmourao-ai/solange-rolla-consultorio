import { describe, expect, it } from 'vitest'
import { createAppointment, type AppointmentRepository } from './create-appointment'
import type { Appointment } from '../domain/appointment'
import { DEFAULT_CANCELLATION_POLICY } from '../domain/cancellation-policy'

describe('create appointment', () => {
  it('persists the cancellation policy version and computed deadline', async () => {
    const insert: AppointmentRepository['insert'] = async (value) => ({
      id: value.id,
      personId: value.personId,
      serviceId: value.serviceId,
      startsAt: value.startsAt.toISOString(),
      endsAt: value.endsAt.toISOString(),
      status: value.status,
      policyVersion: value.policyVersion,
      cancellationDeadlineAt: value.cancellationDeadlineAt,
      cancellationPolicy: value.cancellationPolicySnapshot,
    } satisfies Appointment)
    const appointment = await createAppointment({
      id: '00000000-0000-0000-0000-000000000001',
      personId: '00000000-0000-0000-0000-000000000002',
      serviceId: '00000000-0000-0000-0000-000000000003',
      startsAt: new Date('2026-08-31T15:00:00-03:00'),
      endsAt: new Date('2026-08-31T16:00:00-03:00'),
      policy: DEFAULT_CANCELLATION_POLICY,
    }, { insert })

    expect(appointment.policyVersion).toBe(1)
    expect(appointment.cancellationDeadlineAt).toBe('2026-08-27T18:00:00.000Z')
    expect(appointment.status).toBe('scheduled')
  })
})
