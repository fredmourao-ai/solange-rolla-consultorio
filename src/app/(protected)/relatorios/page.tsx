import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { getAppointmentsReport, getEventsReport, getFinancialReport, getFiscalReport } from '@/modules/reports/public'

const period = { start: '2026-09-01', end: '2026-10-01' }
const financial = getFinancialReport({ payments: [], refunds: [], receivables: [], expenses: [] }, period.start, period.end)
const appointments = getAppointmentsReport({ appointments: [] }, period.start, period.end)
const events = getEventsReport({ events: [] })
const fiscal = getFiscalReport({ documents: [] })

function cents(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
}

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Relatórios" description="Indicadores operacionais derivados dos registros do período." />
      <div className="reports-grid">
        <Card><CardTitle>Financeiro</CardTitle><CardDescription>Período {period.start} a {period.end}.</CardDescription><dl className="report-metrics"><div><dt>Resultado realizado</dt><dd>{cents(financial.realizedCents)}</dd></div><div><dt>Resultado projetado</dt><dd>{cents(financial.projectedCents)}</dd></div><div><dt>Recebíveis vencidos</dt><dd>{cents(financial.overdueReceivablesCents)}</dd></div></dl></Card>
        <Card><CardTitle>Agenda</CardTitle><CardDescription>Consultas e desfechos.</CardDescription><dl className="report-metrics"><div><dt>Realizadas</dt><dd>{appointments.completed}</dd></div><div><dt>Faltas</dt><dd>{appointments.noShows}</dd></div><div><dt>Reagendamentos</dt><dd>{appointments.rescheduleRequests}</dd></div></dl></Card>
        <Card><CardTitle>Eventos</CardTitle><CardDescription>Participação e resultado por evento.</CardDescription><p className="report-empty">{events.length === 0 ? 'Nenhum evento no período.' : `${events.length} eventos encontrados.`}</p></Card>
        <Card><CardTitle>Fiscal</CardTitle><CardDescription>Status de documentos e elegibilidade.</CardDescription><dl className="report-metrics"><div><dt>Emitidos</dt><dd>{fiscal.issued}</dd></div><div><dt>Pendentes</dt><dd>{fiscal.pending}</dd></div><div><dt>Falhas</dt><dd>{fiscal.failed}</dd></div></dl></Card>
      </div>
    </>
  )
}
