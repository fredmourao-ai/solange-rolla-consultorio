export type EventCapacity = { capacity: number; waitlistEnabled: boolean }
export type RegistrationStatus = 'confirmed' | 'pending_payment' | 'waitlisted' | 'rejected_capacity' | 'cancelled'
export type AttendanceStatus = 'present' | 'absent' | 'unknown'

export function registrationStatus(event: EventCapacity, confirmedCount: number): RegistrationStatus {
  if (confirmedCount < event.capacity) return 'confirmed'
  return event.waitlistEnabled ? 'waitlisted' : 'rejected_capacity'
}

export type EventRegistration = { id: string; eventId: string; personId: string; priceCents: number; status: RegistrationStatus; attendanceStatus: AttendanceStatus }
export function createRegistration(input: Omit<EventRegistration, 'status' | 'attendanceStatus'> & { confirmedCount: number; capacity: EventCapacity }): EventRegistration {
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0) throw new Error('INVALID_MONEY_AMOUNT')
  return { id: input.id, eventId: input.eventId, personId: input.personId, priceCents: input.priceCents, status: registrationStatus(input.capacity, input.confirmedCount), attendanceStatus: 'unknown' }
}

export function markAttendance(registration: EventRegistration, attendanceStatus: AttendanceStatus): EventRegistration {
  return { ...registration, attendanceStatus }
}
