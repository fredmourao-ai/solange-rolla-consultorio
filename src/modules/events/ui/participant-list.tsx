import type { EventRegistration } from '../domain/registration'
export function ParticipantList({ registrations }: { registrations: EventRegistration[] }) { return <ul aria-label="Participantes">{registrations.map((registration) => <li key={registration.id}>{registration.personId} - {registration.status} - {registration.attendanceStatus}</li>)}</ul> }
