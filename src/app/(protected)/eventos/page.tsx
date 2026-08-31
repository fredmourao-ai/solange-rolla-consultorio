import { EventCalendar, type EventCalendarItem } from '@/modules/events/ui/event-calendar'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EventosPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('events')
    .select('id,title,starts_at,ends_at,modality,location,capacity,default_price_cents,status,event_registrations(id,status)')
    .order('starts_at', { ascending: true })

  if (error) throw new Error(`EVENTS_READ_FAILED:${error.code}`)

  const events: EventCalendarItem[] = (data ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    modality: event.modality,
    location: event.location,
    capacity: event.capacity,
    registrationCount: (event.event_registrations ?? []).filter((item) => item.status !== 'cancelled').length,
    defaultPriceCents: event.default_price_cents,
    status: event.status,
  }))
  return <>
    <PageHeader
      title="Eventos"
      description="Agenda de eventos, capacidade, inscrições e valores."
    />
    <EventCalendar events={events} />
  </>
}
