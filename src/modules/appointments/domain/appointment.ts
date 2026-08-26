import type { CancellationPolicy } from './cancellation-policy'
import type { AppointmentStatus } from './status'

export type Appointment = {
  id: string
  personId: string
  serviceId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  policyVersion: number
  cancellationDeadlineAt: string
  cancellationPolicy: CancellationPolicy
}
