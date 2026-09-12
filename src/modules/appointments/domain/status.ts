export const APPOINTMENT_STATUSES = [
  'scheduled',
  'pending_confirmation',
  'confirmed',
  'checked_in',
  'in_progress',
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
  | 'check_in'
  | 'start'
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
    check_in: 'checked_in',
    request_reschedule: 'reschedule_requested',
    mark_no_show: 'no_show',
    cancel_in_time: 'cancelled_in_time',
    cancel_late: 'cancelled_late',
    cancel_by_provider: 'cancelled_by_provider',
  },
  checked_in: {
    start: 'in_progress',
    cancel_by_provider: 'cancelled_by_provider',
  },
  in_progress: {
    complete: 'completed',
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

export function availableAppointmentCommands(current: AppointmentStatus): AppointmentCommand[] {
  return Object.keys(transitions[current]) as AppointmentCommand[]
}
