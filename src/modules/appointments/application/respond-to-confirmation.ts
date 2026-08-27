import { assertPublicActionSubject, type PublicActionContext } from '../../../platform/security/public-action'

export type ConfirmationAction = 'confirm' | 'request_reschedule' | 'cancel'
type ConfirmationRepository = { updateStatus(id: string, status: string): Promise<{ status: string }>; createRescheduleTask(id: string): Promise<string> }

export async function respondToConfirmation(input: { appointmentId: string; action: ConfirmationAction; publicActionContext?: PublicActionContext }, repository: ConfirmationRepository): Promise<{ status: string; taskId?: string }> {
  assertPublicActionSubject(input.publicActionContext, 'appointment_response', input.appointmentId)
  if (input.action === 'confirm') { await repository.updateStatus(input.appointmentId, 'confirmed'); return { status: 'confirmed' } }
  if (input.action === 'cancel') { await repository.updateStatus(input.appointmentId, 'cancelled_in_time'); return { status: 'cancelled_in_time' } }
  await repository.updateStatus(input.appointmentId, 'reschedule_requested')
  return { status: 'reschedule_requested', taskId: await repository.createRescheduleTask(input.appointmentId) }
}
