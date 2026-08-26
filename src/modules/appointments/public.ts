export {
  calculateCancellationDeadline,
  DEFAULT_CANCELLATION_POLICY,
  type CancellationPolicy,
} from './domain/cancellation-policy'
export {
  APPOINTMENT_STATUSES,
  transitionAppointment,
  type AppointmentCommand,
  type AppointmentStatus,
} from './domain/status'
export type { Appointment } from './domain/appointment'
export {
  createAppointment,
  type AppointmentRepository,
  type CreateAppointmentInput,
} from './application/create-appointment'
export {
  changeAppointmentStatus,
  type AppointmentStatusRepository,
} from './application/change-appointment-status'
export { listCalendar, type CalendarRepository } from './application/list-calendar'
