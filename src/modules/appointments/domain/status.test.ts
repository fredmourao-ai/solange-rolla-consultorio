import { describe, expect, it } from 'vitest'
import { transitionAppointment, type AppointmentCommand, type AppointmentStatus } from './status'

describe('appointment status transitions', () => {
  it.each<[AppointmentStatus, AppointmentCommand, AppointmentStatus]>([
    ['scheduled', 'send_confirmation', 'pending_confirmation'],
    ['pending_confirmation', 'confirm', 'confirmed'],
    ['confirmed', 'request_reschedule', 'reschedule_requested'],
    ['reschedule_requested', 'reschedule', 'rescheduled'],
    ['confirmed', 'complete', 'completed'],
    ['confirmed', 'mark_no_show', 'no_show'],
    ['scheduled', 'cancel_in_time', 'cancelled_in_time'],
    ['scheduled', 'cancel_late', 'cancelled_late'],
    ['scheduled', 'cancel_by_provider', 'cancelled_by_provider'],
  ])('%s + %s -> %s', (current, command, expected) => {
    expect(transitionAppointment(current, command)).toBe(expected)
  })

  it('rejects invalid transitions', () => {
    expect(() => transitionAppointment('completed', 'confirm')).toThrow('INVALID_APPOINTMENT_TRANSITION')
    expect(() => transitionAppointment('cancelled_late', 'cancel_in_time')).toThrow('INVALID_APPOINTMENT_TRANSITION')
  })
})
