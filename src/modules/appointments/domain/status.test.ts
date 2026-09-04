import { describe, expect, it } from 'vitest'
import { availableAppointmentCommands, transitionAppointment, type AppointmentCommand, type AppointmentStatus } from './status'

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

  it('lists the commands valid from a given status, none for a terminal one', () => {
    expect(availableAppointmentCommands('confirmed').sort()).toEqual(
      ['request_reschedule', 'complete', 'mark_no_show', 'cancel_in_time', 'cancel_late', 'cancel_by_provider'].sort(),
    )
    expect(availableAppointmentCommands('no_show')).toEqual([])
    expect(availableAppointmentCommands('completed')).toEqual([])
  })
})
