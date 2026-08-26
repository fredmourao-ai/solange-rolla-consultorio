import { transitionAppointment, type AppointmentCommand } from '../domain/status'
import type { Appointment } from '../domain/appointment'

export type AppointmentStatusRepository = {
  updateStatus(id: string, status: Appointment['status']): Promise<Appointment>
}

export async function changeAppointmentStatus(
  appointment: Appointment,
  command: AppointmentCommand,
  repository: AppointmentStatusRepository,
): Promise<Appointment> {
  return repository.updateStatus(appointment.id, transitionAppointment(appointment.status, command))
}
