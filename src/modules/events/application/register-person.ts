import { createRegistration, type EventCapacity, type EventRegistration } from '../domain/registration'
export type RegistrationRepository = { findByPerson(eventId: string, personId: string): Promise<EventRegistration | null>; insert(registration: EventRegistration): Promise<EventRegistration> }
export async function registerPerson(input: Omit<EventRegistration, 'status' | 'attendanceStatus'> & { confirmedCount: number; capacity: EventCapacity }, repository: RegistrationRepository) {
  return (await repository.findByPerson(input.eventId, input.personId)) ?? repository.insert(createRegistration(input))
}
