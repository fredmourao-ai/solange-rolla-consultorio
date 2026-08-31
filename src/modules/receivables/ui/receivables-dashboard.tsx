export type ReceivableDashboardRow = {
  id: string
  personName: string
  payerName: string
  sourceType: string
  originalAmountCents: number
  paidCents: number
  status: string
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const statusLabels: Record<string, string> = {
  open: 'Em aberto',
  partial: 'Parcial',
  paid: 'Pago',
  overdue: 'Vencido',
  refund_due: 'Reembolso devido',
  refunded: 'Reembolsado',
  voided: 'Cancelado',
}

function cents(value: number): string {
  return money.format(value / 100)
}

export function ReceivablesDashboard({ rows }: { rows: ReceivableDashboardRow[] }) {
  const original = rows.reduce((sum, row) => sum + row.originalAmountCents, 0)
  const paid = rows.reduce((sum, row) => sum + row.paidCents, 0)
  const balance = Math.max(0, original - paid)
  return <section className="receivables-dashboard" aria-label="Resumo financeiro">
    <dl className="report-metrics">
      <div><dt>Total lançado</dt><dd>{cents(original)}</dd></div>
      <div><dt>Total recebido</dt><dd>{cents(paid)}</dd></div>
      <div><dt>Saldo a receber</dt><dd>{cents(balance)}</dd></div>
    </dl>
    {rows.length === 0 ? <p className="empty-state">Nenhum recebível encontrado.</p> : (
      <ul className="receivables-list">
        {rows.map((row) => <li key={row.id}>
          <div><strong>{row.personName}</strong><span>Pagador: {row.payerName}</span></div>
          <div><span>{statusLabels[row.status] ?? row.status}</span><span>{cents(row.originalAmountCents - row.paidCents)} em aberto</span></div>
        </li>)}
      </ul>
    )}
  </section>
}
