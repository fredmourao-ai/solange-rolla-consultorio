import Link from 'next/link'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { applyAdjustmentAction, createExpenseCategoryAction, createPayableAction, createRecurrenceAction, createVendorAction, payPayableAction, recordPaymentAction, refundPaymentAction } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0
const methods = ['pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'other'] as const

export default async function FinanceOperationsPage() {
  const client = await createServerSupabaseClient()
  const [{ data: receivables }, { data: payments }, { data: vendors }, { data: categories }, { data: payables }, { data: rules }] = await Promise.all([
    client.from('receivables').select('id,original_amount_cents,status,person:people!receivables_person_id_fkey(civil_name,preferred_name)').order('created_at', { ascending: false }).limit(100),
    client.from('payments').select('id,receivable_id,amount_cents,method,paid_at').order('paid_at', { ascending: false }).limit(100),
    client.from('vendors').select('id,legal_name').order('legal_name'),
    client.from('expense_categories').select('id,name').eq('active', true).order('name'),
    client.from('payables').select('id,description,amount_cents,paid_cents,status,due_date,vendor:vendors!payables_vendor_id_fkey(legal_name)').order('due_date').limit(100),
    client.from('recurrence_rules').select('id,description,amount_cents,day_of_month,month_end_fallback,active').eq('active', true).order('created_at', { ascending: false }),
  ])
  return <>
    <PageHeader title="Operações financeiras" description="Pagamentos, ajustes, estornos, contas a pagar e recorrências com histórico auditável." />
    <p><Link href="/financeiro">← Voltar ao financeiro</Link></p>

    <section><h2>Recebíveis</h2>
      {(receivables ?? []).map((row) => <article key={row.id} className="card">
        <h3>{row.person?.preferred_name || row.person?.civil_name || 'Paciente'} — R$ {(row.original_amount_cents / 100).toFixed(2)}</h3><p>Status: {row.status}</p>
        <form action={recordPaymentAction} className="stack-form"><input type="hidden" name="receivable_id" value={row.id}/><input type="hidden" name="idempotency_key" value={`ui-payment:${crypto.randomUUID()}`}/><label>Pagamento <input name="amount" inputMode="decimal" required /></label><label>Método <select name="method">{methods.map(m => <option key={m} value={m}>{m}</option>)}</select></label><button type="submit">Registrar pagamento</button></form>
        <form action={applyAdjustmentAction} className="stack-form"><input type="hidden" name="receivable_id" value={row.id}/><label>Ajuste <input name="amount" inputMode="decimal" required /></label><label>Tipo <select name="direction"><option value="discount">Desconto/isenção</option><option value="increase">Acréscimo</option></select></label><label>Justificativa <input name="reason" required /></label><button type="submit">Aplicar ajuste</button></form>
      </article>)}
    </section>

    <section><h2>Pagamentos e estornos</h2>
      {(payments ?? []).map((payment) => <form key={payment.id} action={refundPaymentAction} className="stack-form card"><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="idempotency_key" value={`ui-refund:${crypto.randomUUID()}`}/><p>Pagamento R$ {(payment.amount_cents/100).toFixed(2)} — {payment.method}</p><label>Valor do estorno <input name="amount" required /></label><label>Método <select name="method" defaultValue={payment.method}>{methods.map(m => <option key={m} value={m}>{m}</option>)}</select></label><label>Motivo <input name="reason" required /></label><button type="submit">Registrar estorno</button></form>)}
    </section>

    <section><h2>Cadastros para despesas</h2><p>Cadastre fornecedores e categorias antes de lançar uma nova conta a pagar.</p>
      <form action={createVendorAction} className="stack-form"><label>Nome do fornecedor<input name="legal_name" required /></label><button type="submit">Cadastrar fornecedor</button></form>
      <form action={createExpenseCategoryAction} className="stack-form"><label>Nome da categoria<input name="name" required /></label><button type="submit">Cadastrar categoria</button></form>
    </section>

    <section><h2>Nova conta a pagar</h2>
      <form action={createPayableAction} className="stack-form"><input type="hidden" name="idempotency_key" value={`ui-payable:${crypto.randomUUID()}`}/><label>Fornecedor <select name="vendor_id" required>{(vendors ?? []).map(v => <option key={v.id} value={v.id}>{v.legal_name}</option>)}</select></label><label>Categoria <select name="category_id" required>{(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Descrição <input name="description" required /></label><label>Valor <input name="amount" required /></label><label>Vencimento <input name="due_date" type="date" required /></label><label>Competência <input name="competence" type="date" required /></label><button type="submit">Criar conta</button></form>
    </section>

    <section><h2>Contas a pagar</h2>{(payables ?? []).map((payable) => <form key={payable.id} action={payPayableAction} className="stack-form card"><input type="hidden" name="payable_id" value={payable.id}/><input type="hidden" name="idempotency_key" value={`ui-payable-payment:${crypto.randomUUID()}`}/><p>{payable.vendor?.legal_name || 'Fornecedor'} — {payable.description} — R$ {(payable.amount_cents/100).toFixed(2)} — pago R$ {(payable.paid_cents/100).toFixed(2)} — {payable.status}</p><label>Baixa <input name="amount" required /></label><label>Método <input name="method" required defaultValue="pix" /></label><button type="submit">Registrar baixa</button></form>)}</section>

    <section><h2>Nova recorrência</h2><form action={createRecurrenceAction} className="stack-form"><label>Fornecedor <select name="vendor_id" required>{(vendors ?? []).map(v => <option key={v.id} value={v.id}>{v.legal_name}</option>)}</select></label><label>Categoria <select name="category_id" required>{(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Descrição <input name="description" required /></label><label>Valor <input name="amount" required /></label><label>Início <input name="start_date" type="date" required /></label><label>Dia do mês <input name="day_of_month" type="number" min="1" max="31" required /></label><label>Fim do mês <select name="month_end_fallback"><option value="last_day">Usar último dia</option><option value="reject">Não gerar</option></select></label><button type="submit">Criar recorrência</button></form><ul>{(rules ?? []).map(rule => <li key={rule.id}>{rule.description}: dia {rule.day_of_month} ({rule.month_end_fallback})</li>)}</ul></section>
  </>
}
