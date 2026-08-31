import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'
import { APPOINTMENT_STATUSES, transitionAppointment, type AppointmentCommand, type AppointmentStatus } from '../domain/status'

export type ConfirmationAction = 'confirm' | 'request_reschedule' | 'cancel'
type ConfirmationRepository = {
  getResponseState(id: string): Promise<{ status: string; cancellationDeadlineAt: string }>
  updateStatus(id: string, status: string, expectedStatus: string): Promise<{ status: string }>
  createRescheduleTask(id: string): Promise<string>
}

export async function respondToConfirmation(input: {
  appointmentId: string
  action: ConfirmationAction
  acknowledgeLateCharge?: boolean
  publicActionContext?: PublicActionContext
  now?: Date
}, repository: ConfirmationRepository): Promise<{ status: string; taskId?: string }> {
  assertPublicActionSubject(input.publicActionContext, 'appointment_response', input.appointmentId)
  const state = await repository.getResponseState(input.appointmentId)
  if (!APPOINTMENT_STATUSES.includes(state.status as AppointmentStatus)) throw new Error('INVALID_APPOINTMENT_STATUS')
  const current = state.status as AppointmentStatus
  const now = input.now ?? new Date()

  if (input.action === 'confirm') {
    const status = transitionAppointment(current, 'confirm')
    await repository.updateStatus(input.appointmentId, status, current)
    return { status }
  }
  if (input.action === 'cancel') {
    const late = now.getTime() > new Date(state.cancellationDeadlineAt).getTime()
    if (late && !input.acknowledgeLateCharge) throw new Error('LATE_CANCELLATION_ACK_REQUIRED')
    const command: AppointmentCommand = late ? 'cancel_late' : 'cancel_in_time'
    const status = transitionAppointment(current, command)
    await repository.updateStatus(input.appointmentId, status, current)
    return { status }
  }

  const status = transitionAppointment(current, 'request_reschedule')
  await repository.updateStatus(input.appointmentId, status, current)
  return {
    status,
    taskId: await repository.createRescheduleTask(input.appointmentId),
  }
}
