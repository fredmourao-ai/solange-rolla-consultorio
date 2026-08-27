import Link from 'next/link'
import type { AttentionItem } from '../application/get-attention-items'

const labels: Record<AttentionItem['kind'], string> = {
  fiscal_pending: 'Fiscal',
  receivable_overdue: 'Recebível vencido',
  reschedule_requested: 'Reagendamento',
  appointment_confirmation: 'Confirmação',
  payable_due: 'Despesa',
  form_pending: 'Formulário',
  signature_pending: 'Assinatura',
  birthday: 'Aniversário',
}

export function AttentionDashboard({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="attention-title" className="attention-dashboard">
      <div className="attention-dashboard__header">
        <div>
          <h2 id="attention-title">Atenção hoje</h2>
          <p>Itens administrativos que pedem uma ação.</p>
        </div>
        <strong aria-label={`${items.length} itens pendentes`}>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">Nenhuma pendência operacional para hoje.</p>
      ) : (
        <ul className="attention-dashboard__list">
          {items.map((attention) => (
            <li key={`${attention.kind}:${attention.entityId}`} className={`attention-item attention-item--${attention.severity}`}>
              <div>
                <span className="attention-item__kind">{labels[attention.kind]}</span>
                <h3>{attention.title}</h3>
                {attention.dueAt && <time dateTime={attention.dueAt}>Prazo: {attention.dueAt}</time>}
              </div>
              <Link className="ui-button ui-button--outline" href={attention.actionHref}>Abrir</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
