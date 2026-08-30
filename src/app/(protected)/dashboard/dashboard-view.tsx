import { Card, CardDescription, CardTitle } from '../../../shared/ui/card'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function DashboardView({
  upcomingAppointments,
  openReceivablesCents,
  upcomingEvents,
  peopleCount,
}: {
  upcomingAppointments: number
  openReceivablesCents: number
  upcomingEvents: number
  peopleCount: number
}) {
  return <div className="dashboard-grid">
    <Card>
      <CardTitle>Próximas consultas</CardTitle>
      <CardDescription>Agenda dos próximos 7 dias.</CardDescription>
      <strong>{upcomingAppointments} consultas</strong>
    </Card>
    <Card>
      <CardTitle>Contas a receber</CardTitle>
      <CardDescription>Saldo lançado ainda em aberto.</CardDescription>
      <strong>{money.format(openReceivablesCents / 100)}</strong>
    </Card>
    <Card>
      <CardTitle>Eventos</CardTitle>
      <CardDescription>Eventos futuros cadastrados.</CardDescription>
      <strong>{upcomingEvents} evento{upcomingEvents === 1 ? '' : 's'}</strong>
    </Card>
    <Card>
      <CardTitle>Pessoas</CardTitle>
      <CardDescription>Cadastros disponíveis para atendimento.</CardDescription>
      <strong>{peopleCount} pessoas</strong>
    </Card>
  </div>
}
