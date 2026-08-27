import { createEvent, type Event } from '../domain/event'
export type EventRepository = { insert(event: Event): Promise<Event> }
export async function createEventUseCase(input: Omit<Event, 'status'>, repository: EventRepository) { return repository.insert(createEvent(input)) }
