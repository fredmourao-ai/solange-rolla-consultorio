import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { DashboardView } from './dashboard-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [appointments, receivables, events, people] = await Promise.all([
    supabase.from('appointments').select('id', { count: 'exact', head: true })
      .gte('starts_at', now.toISOString()).lt('starts_at', horizon.toISOString()),
    supabase.from('receivables').select('original_amount_cents,status,payments(amount_cents)')
      .in('status', ['open', 'partial', 'overdue']),
    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('starts_at', now.toISOString()).neq('status', 'cancelled'),
    supabase.from('people').select('id', { count: 'exact', head: true }),
  ])

  const failedQuery = [
    ['appointments', appointments.error],
    ['receivables', receivables.error],
    ['events', events.error],
    ['people', people.error],
  ] as const
  const firstFailure = failedQuery.find(([, error]) => Boolean(error))
  if (firstFailure) {
    const [source, error] = firstFailure
    throw new Error(`DASHBOARD_READ_FAILED:${source}:${error?.code ?? 'unknown'}`)
  }

  const openReceivablesCents = (receivables.data ?? []).reduce((sum, row) => {
    const paid = (row.payments ?? []).reduce((paidSum, payment) => paidSum + payment.amount_cents, 0)
    return sum + Math.max(0, row.original_amount_cents - paid)
  }, 0)

  return <>
    <PageHeader title="Dashboard" description="Visão operacional do consultório." />
    <DashboardView
      upcomingAppointments={appointments.count ?? 0}
      openReceivablesCents={openReceivablesCents}
      upcomingEvents={events.count ?? 0}
      peopleCount={people.count ?? 0}
    />
  </>
}
