import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { buildOperationalReports } from '@/modules/reports/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'

function businessDate(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
function cents(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
}

export default async function ReportsPage() {
  const start = businessDate(new Date())
  const end = addDays(start, 30)
  const fromIso = new Date(`${start}T00:00:00-03:00`).toISOString()
  const toIso = new Date(`${end}T00:00:00-03:00`).toISOString()
  const supabase = await createServerSupabaseClient()

  const [appointmentsResult, paymentsResult, refundsResult, receivablesResult] = await Promise.all([
    supabase.from('appointments').select('id,starts_at,status').gte('starts_at', fromIso).lt('starts_at', toIso),
    supabase.from('payments').select('amount_cents,paid_at,method').gte('paid_at', fromIso).lt('paid_at', toIso),
    supabase.from('payment_refunds').select('amount_cents,refunded_at').gte('refunded_at', fromIso).lt('refunded_at', toIso),
    supabase.from('receivables').select('original_amount_cents,status').in('status', ['open', 'overdue']),
  ])
  const [payablesResult, eventsResult, fiscalResult] = await Promise.all([
    supabase.from('payables').select('amount_cents,due_date,payable_payments(paid_at)'),
    supabase.from('events').select('id,title,capacity,event_registrations(price_cents,status,attendance_status),event_expenses(amount_cents)').gte('starts_at', fromIso).lt('starts_at', toIso),
    supabase.from('fiscal_documents').select('id,status,amount_cents').gte('created_at', fromIso).lt('created_at', toIso),
  ])
  const results = [appointmentsResult, paymentsResult, refundsResult, receivablesResult, payablesResult, eventsResult, fiscalResult]
  if (results.some((result) => result.error)) throw new Error('REPORTS_READ_FAILED')

  const reports = buildOperationalReports({
    appointments: appointmentsResult.data ?? [],
    payments: paymentsResult.data ?? [],
    refunds: refundsResult.data ?? [],
    receivables: (receivablesResult.data ?? []).map((row) => ({ amount_cents: row.original_amount_cents, status: row.status })),
    payables: (payablesResult.data ?? []).map((row) => ({
      amount_cents: row.amount_cents,
      due_date: row.due_date,
      paid_at: row.payable_payments?.[0]?.paid_at ?? null,
    })),
    events: (eventsResult.data ?? []).map((row) => ({
      id: row.id, title: row.title, capacity: row.capacity,
      registrations: row.event_registrations ?? [], expenses: row.event_expenses ?? [],
    })),
    fiscalDocuments: fiscalResult.data ?? [],
  }, start, end)

  return <>
    <PageHeader title="Relatórios" description="Indicadores derivados dos registros dos próximos 30 dias." />
    <div className="reports-grid">
      <Card><CardTitle>Financeiro</CardTitle><CardDescription>Período {start} a {end}.</CardDescription><dl className="report-metrics"><div><dt>Resultado realizado</dt><dd>{cents(reports.financial.realizedCents)}</dd></div><div><dt>Resultado projetado</dt><dd>{cents(reports.financial.projectedCents)}</dd></div><div><dt>Recebíveis vencidos</dt><dd>{cents(reports.financial.overdueReceivablesCents)}</dd></div></dl></Card>
      <Card><CardTitle>Agenda</CardTitle><CardDescription>Consultas e desfechos.</CardDescription><dl className="report-metrics"><div><dt>Total</dt><dd>{reports.appointments.total}</dd></div><div><dt>Realizadas</dt><dd>{reports.appointments.completed}</dd></div><div><dt>Pendentes de confirmação</dt><dd>{reports.appointments.pendingConfirmation}</dd></div><div><dt>Faltas</dt><dd>{reports.appointments.noShows}</dd></div></dl></Card>
      <Card><CardTitle>Eventos</CardTitle><CardDescription>Participação e resultado por evento.</CardDescription><p className="report-empty">{reports.events.length === 0 ? 'Nenhum evento no período.' : `${reports.events.length} eventos encontrados.`}</p></Card>
      <Card><CardTitle>Fiscal</CardTitle><CardDescription>Status de documentos fiscais.</CardDescription><dl className="report-metrics"><div><dt>Emitidos</dt><dd>{reports.fiscal.issued}</dd></div><div><dt>Pendentes</dt><dd>{reports.fiscal.pending}</dd></div><div><dt>Falhas</dt><dd>{reports.fiscal.failed}</dd></div><div><dt>Valor emitido</dt><dd>{cents(reports.fiscal.issuedCents)}</dd></div></dl></Card>
    </div>
  </>
}
