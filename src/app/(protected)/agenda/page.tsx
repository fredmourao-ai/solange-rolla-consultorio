import Link from 'next/link'
import { calendarRange, type CalendarView } from '@/modules/appointments/application/calendar-range'
import { AppointmentCalendar, type AppointmentCalendarItem } from '@/modules/appointments/ui/calendar'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateOnly = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

function normalizeView(value?: string): CalendarView {
  return value === 'day' || value === 'month' ? value : 'week'
}

function normalizeDate(value?: string): string {
  const fallback = dateOnly.format(new Date())
  if (!value) return fallback
  try { calendarRange('day', value); return value } catch { return fallback }
}

export default async function AgendaPage({ searchParams }: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const query = await searchParams
  const view = normalizeView(query.view)
  const anchor = normalizeDate(query.date)
  const range = calendarRange(view, anchor)
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('id,starts_at,ends_at,status,cancellation_deadline_at,person:people!appointments_person_id_fkey(civil_name,preferred_name),service:services!appointments_service_id_fkey(name)')
    .gte('starts_at', range.from.toISOString())
    .lt('starts_at', range.to.toISOString())
    .order('starts_at', { ascending: true })

  if (error) throw new Error(`AGENDA_READ_FAILED:${error.code}`)

  const items: AppointmentCalendarItem[] = (data ?? []).map((row) => ({
    id: row.id,
    patientName: row.person?.preferred_name || row.person?.civil_name || 'Paciente',
    serviceName: row.service?.name || 'Consulta',
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    cancellationDeadlineAt: row.cancellation_deadline_at,
  }))

  return <>
    <PageHeader title="Agenda" description="Consultas e prazos de cancelamento no horário de Brasília." />
    <nav className="calendar-view-switch" aria-label="Visualização da agenda">
      <Link aria-current={view === 'day' ? 'page' : undefined} href={`/agenda?view=day&date=${anchor}`}>Dia</Link>
      <Link aria-current={view === 'week' ? 'page' : undefined} href={`/agenda?view=week&date=${anchor}`}>Semana</Link>
      <Link aria-current={view === 'month' ? 'page' : undefined} href={`/agenda?view=month&date=${anchor}`}>Mês</Link>
    </nav>
    <p className="calendar-anchor"><strong>Data de referência:</strong> {anchor.split('-').reverse().join('/')}</p>
    <AppointmentCalendar items={items} />
  </>
}
