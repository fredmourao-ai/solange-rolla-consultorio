export const APPOINTMENT_STATUSES = [
  'scheduled',
  'pending_confirmation',
  'confirmed',
  'reschedule_requested',
  'rescheduled',
  'cancelled_in_time',
  'cancelled_late',
  'completed',
  'no_show',
  'cancelled_by_provider',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export type AppointmentCommand =
  | 'send_confirmation'
  | 'confirm'
  | 'request_reschedule'
  | 'reschedule'
  | 'cancel_in_time'
  | 'cancel_late'
  | 'complete'
  | 'mark_no_show'
  | 'cancel_by_provider'

const transitions: Record<AppointmentStatus, Partial<Record<AppointmentCommand, AppointmentStatus>>> = {
  scheduled: {
    send_confirmation: 'pending_confirmation',
    cancel_in_time: 'cancelled_in_time',
    cancel_late: 'cancelled_late',
    cancel_by_provider: 'cancelled_by_provider',
  },
  pending_confirmation: {
    confirm: 'confirmed',
    request_reschedule: 'reschedule_requested',
    cancel_in_time: 'cancelled_in_time',
    cancel_late: 'cancelled_late',
    cancel_by_provider: 'cancelled_by_provider',
  },
  confirmed: {
    request_reschedule: 'reschedule_requested',
    complete: 'completed',
    mark_no_show: 'no_show',
    cancel_in_time: 'cancelled_in_time',
    cancel_late: 'cancelled_late',
    cancel_by_provider: 'cancelled_by_provider',
  },
  reschedule_requested: {
    reschedule: 'rescheduled',
    cancel_by_provider: 'cancelled_by_provider',
  },
  rescheduled: {
    send_confirmation: 'pending_confirmation',
    confirm: 'confirmed',
    request_reschedule: 'reschedule_requested',
    cancel_in_time: 'cancelled_in_time',
    cancel_late: 'cancelled_late',
    cancel_by_provider: 'cancelled_by_provider',
  },
  cancelled_in_time: {},
  cancelled_late: {},
  completed: {},
  no_show: {},
  cancelled_by_provider: {},
}

export function transitionAppointment(
  current: AppointmentStatus,
  command: AppointmentCommand,
): AppointmentStatus {
  const next = transitions[current][command]
  if (!next) throw new Error('INVALID_APPOINTMENT_TRANSITION')
  return next
}
