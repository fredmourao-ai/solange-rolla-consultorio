import { markAttendance, type AttendanceStatus, type EventRegistration } from '../domain/registration'
export type AttendanceRepository = { update(registration: EventRegistration): Promise<EventRegistration> }
export async function markRegistrationAttendance(registration: EventRegistration, status: AttendanceStatus, repository: AttendanceRepository) { return repository.update(markAttendance(registration, status)) }
