import { calculateCancellationDeadline, type CancellationPolicy } from '../domain/cancellation-policy'
import type { Appointment } from '../domain/appointment'

export type CreateAppointmentInput = {
  id: string
  personId: string
  serviceId: string
  startsAt: Date
  endsAt: Date
  policy: CancellationPolicy
}

export type AppointmentRepository = {
  insert(input: CreateAppointmentInput & {
    status: 'scheduled'
    policyVersion: number
    cancellationDeadlineAt: string
    cancellationPolicySnapshot: CancellationPolicy
  }): Promise<Appointment>
}

export async function createAppointment(
  input: CreateAppointmentInput,
  repository: AppointmentRepository,
): Promise<Appointment> {
  if (input.endsAt <= input.startsAt) throw new Error('INVALID_APPOINTMENT_INTERVAL')
  const deadline = calculateCancellationDeadline(input.startsAt, input.policy)
  return repository.insert({
    ...input,
    status: 'scheduled',
    policyVersion: input.policy.policyVersion,
    cancellationDeadlineAt: deadline.toISOString(),
    cancellationPolicySnapshot: structuredClone(input.policy),
  })
}
