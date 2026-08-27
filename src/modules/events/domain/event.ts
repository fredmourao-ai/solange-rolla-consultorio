export type EventStatus = 'planned' | 'open' | 'full' | 'completed' | 'cancelled'
export type Event = { id: string; title: string; description: string | null; type: string; startsAt: string; endsAt: string; timezone: 'America/Sao_Paulo'; location: string | null; modality: 'in_person' | 'online' | 'hybrid'; capacity: number; defaultPriceCents: number; requiredFormTemplateId: string | null; status: EventStatus }
export function createEvent(input: Omit<Event, 'status'>): Event {
  if (!input.title.trim() || input.capacity < 1 || !Number.isSafeInteger(input.defaultPriceCents) || input.defaultPriceCents < 0) throw new Error('INVALID_EVENT')
  return { ...input, status: 'planned' }
}
