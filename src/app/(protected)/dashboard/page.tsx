import { Card, CardDescription, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { StatusBadge } from '@/shared/ui/status-badge'

export default function DashboardPage() {
  return <>
    <PageHeader title="Dashboard" description="Visão operacional do consultório." />
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      <Card><CardTitle>Próximas consultas</CardTitle><CardDescription>Agenda de hoje e dos próximos dias.</CardDescription><p><StatusBadge status="neutral">Sem dados</StatusBadge></p></Card>
      <Card><CardTitle>Contas a receber</CardTitle><CardDescription>Valores pendentes de baixa.</CardDescription><p><StatusBadge status="neutral">Sem dados</StatusBadge></p></Card>
      <Card><CardTitle>Tarefas</CardTitle><CardDescription>Atividades administrativas pendentes.</CardDescription><p><StatusBadge status="neutral">Sem dados</StatusBadge></p></Card>
    </div>
    <EmptyState title="Comece pelo cadastro de pessoas" description="Quando o módulo de pessoas estiver disponível, os próximos passos aparecerão aqui." />
  </>
}
