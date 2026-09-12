import { describe, expect, it } from 'vitest'
import { availableAppointmentCommands, transitionAppointment, type AppointmentCommand, type AppointmentStatus } from './status'

describe('appointment status transitions', () => {
  it.each<[AppointmentStatus, AppointmentCommand, AppointmentStatus]>([
    ['scheduled', 'send_confirmation', 'pending_confirmation'],
    ['pending_confirmation', 'confirm', 'confirmed'],
    ['confirmed', 'check_in', 'checked_in'],
    ['checked_in', 'start', 'in_progress'],
    ['in_progress', 'complete', 'completed'],
    ['confirmed', 'request_reschedule', 'reschedule_requested'],
    ['reschedule_requested', 'reschedule', 'rescheduled'],
    ['confirmed', 'mark_no_show', 'no_show'],
    ['scheduled', 'cancel_in_time', 'cancelled_in_time'],
    ['scheduled', 'cancel_late', 'cancelled_late'],
    ['scheduled', 'cancel_by_provider', 'cancelled_by_provider'],
  ])('%s + %s -> %s', (current, command, expected) => {
    expect(transitionAppointment(current, command)).toBe(expected)
  })

  it('rejects shortcuts that bypass the real reception and care workflow', () => {
    expect(() => transitionAppointment('confirmed', 'complete')).toThrow('INVALID_APPOINTMENT_TRANSITION')
    expect(() => transitionAppointment('checked_in', 'complete')).toThrow('INVALID_APPOINTMENT_TRANSITION')
    expect(() => transitionAppointment('scheduled', 'start')).toThrow('INVALID_APPOINTMENT_TRANSITION')
    expect(() => transitionAppointment('completed', 'confirm')).toThrow('INVALID_APPOINTMENT_TRANSITION')
  })

  it('lists the commands valid from operational states and none for terminal ones', () => {
    expect(availableAppointmentCommands('checked_in')).toContain('start')
    expect(availableAppointmentCommands('in_progress')).toEqual(['complete'])
    expect(availableAppointmentCommands('no_show')).toEqual([])
    expect(availableAppointmentCommands('completed')).toEqual([])
  })
})
