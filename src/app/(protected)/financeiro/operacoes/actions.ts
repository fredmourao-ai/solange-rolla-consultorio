'use server'

import { redirect } from 'next/navigation'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { deriveReceivableStatus, type ReceivableStatus } from '@/modules/receivables/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import type { Json } from '@/platform/supabase/types'

const PAYMENT_METHODS = new Set(['pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'other'])

type FinancialRpc = (name: 'record_receivable_payment_atomic' | 'refund_receivable_payment_atomic' | 'record_payable_payment_atomic', args: Record<string, string | number>) => PromiseLike<{ data: string | null; error: { code: string; message: string } | null }>
function rpcFailure(error: { code: string; message: string }, fallback: string): Error {
  const known = ['PAYMENT_EXCEEDS_BALANCE','FINANCE_REFUND_EXCEEDS_PAYMENT','FINANCE_PAYABLE_PAYMENT_INVALID','FINANCE_IDEMPOTENCY_CONFLICT','FINANCE_RECEIVABLE_NOT_FOUND','FINANCE_PAYMENT_NOT_FOUND','FINANCE_PAYABLE_NOT_FOUND']
  return new Error(known.find((code) => error.message.includes(code)) ?? `${fallback}:${error.code}`)
}
async function financialRpc(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, name: Parameters<FinancialRpc>[0], args: Record<string, string | number>, fallback: string) {
  const rpc = client.rpc.bind(client) as unknown as FinancialRpc
  const { error } = await rpc(name, args)
  if (error) throw rpcFailure(error, fallback)
}
function cents(value: FormDataEntryValue | null): number { const parsed = Math.round(Number(String(value ?? '').replace(',', '.')) * 100); if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('FINANCE_INVALID_AMOUNT'); return parsed }
function text(formData: FormData, key: string): string { const value = String(formData.get(key) ?? '').trim(); if (!value) throw new Error(`FINANCE_${key.toUpperCase()}_REQUIRED`); return value }
async function context(roles: Array<'psychologist_owner' | 'accounting'>) { const session = await getStaffSession(); const authorized = authorizeStaffSession(session, roles); return { authorized, client: await createServerSupabaseClient() } }
async function audit(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, actorId: string, action: string, entityType: string, entityId: string, metadata: { [key: string]: Json | undefined }) { const { error } = await client.from('audit_events').insert({ actor_user_id: actorId, action, entity_type: entityType, entity_id: entityId, correlation_id: entityId, metadata }); if (error) throw new Error('FINANCE_AUDIT_FAILED') }
async function refreshReceivableStatus(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, receivableId: string) {
  const [{ data: receivable }, { data: adjustments }, { data: payments }, { data: refunds }] = await Promise.all([
    client.from('receivables').select('original_amount_cents,status').eq('id', receivableId).single(),
    client.from('receivable_adjustments').select('adjustment_cents').eq('receivable_id', receivableId),
    client.from('payments').select('id,amount_cents').eq('receivable_id', receivableId),
    client.from('payment_refunds').select('amount_cents,payment:payments!inner(receivable_id)').eq('payment.receivable_id', receivableId),
  ])
  if (!receivable) throw new Error('FINANCE_RECEIVABLE_NOT_FOUND')
  const chargeCents = Math.max(0, receivable.original_amount_cents + (adjustments ?? []).reduce((sum, row) => sum + row.adjustment_cents, 0))
  const paidCents = (payments ?? []).reduce((sum, row) => sum + row.amount_cents, 0)
  const refundedCents = (refunds ?? []).reduce((sum, row) => sum + row.amount_cents, 0)
  const status = deriveReceivableStatus({ chargeCents, netPaidCents: paidCents - refundedCents, refundedCents, currentStatus: receivable.status as ReceivableStatus })
  const { error } = await client.from('receivables').update({ status }).eq('id', receivableId)
  if (error) throw new Error('FINANCE_STATUS_UPDATE_FAILED')
}
export async function recordPaymentAction(formData: FormData) { const { client } = await context(['psychologist_owner']); const receivableId=text(formData,'receivable_id'), method=text(formData,'method'), idempotencyKey=text(formData,'idempotency_key'); const amountCents=cents(formData.get('amount')); if(!PAYMENT_METHODS.has(method)) throw new Error('FINANCE_INVALID_PAYMENT_METHOD'); await financialRpc(client,'record_receivable_payment_atomic',{p_receivable_id:receivableId,p_amount_cents:amountCents,p_method:method,p_idempotency_key:idempotencyKey},'FINANCE_PAYMENT_CREATE_FAILED'); redirect('/financeiro/operacoes') }
export async function applyAdjustmentAction(formData: FormData) { const { authorized, client } = await context(['psychologist_owner']); const receivableId = text(formData, 'receivable_id'); const amountCents = cents(formData.get('amount')); const direction = text(formData, 'direction'); const reason = text(formData, 'reason'); if (!['discount','increase'].includes(direction)) throw new Error('FINANCE_ADJUSTMENT_DIRECTION_INVALID'); const adjustmentCents = direction === 'discount' ? -amountCents : amountCents; const { data: row, error } = await client.from('receivable_adjustments').insert({ receivable_id: receivableId, adjustment_cents: adjustmentCents, reason, actor_id: authorized.userId }).select('id').single(); if (error || !row) throw new Error('FINANCE_ADJUSTMENT_CREATE_FAILED'); await audit(client, authorized.userId, 'receivable.adjusted', 'receivable_adjustment', row.id, { receivableId, adjustmentCents, reason }); await refreshReceivableStatus(client, receivableId); redirect('/financeiro/operacoes') }
export async function refundPaymentAction(formData: FormData) { const { client } = await context(['psychologist_owner']); const paymentId=text(formData,'payment_id'), reason=text(formData,'reason'), method=text(formData,'method'), idempotencyKey=text(formData,'idempotency_key'); const amountCents=cents(formData.get('amount')); if(!PAYMENT_METHODS.has(method)) throw new Error('FINANCE_INVALID_PAYMENT_METHOD'); await financialRpc(client,'refund_receivable_payment_atomic',{p_payment_id:paymentId,p_amount_cents:amountCents,p_method:method,p_reason:reason,p_idempotency_key:idempotencyKey},'FINANCE_REFUND_CREATE_FAILED'); redirect('/financeiro/operacoes') }
export async function createPayableAction(formData: FormData) { const { authorized, client } = await context(['psychologist_owner','accounting']); const vendorId=text(formData,'vendor_id'), categoryId=text(formData,'category_id'), description=text(formData,'description'), dueDate=text(formData,'due_date'), competence=text(formData,'competence'), idempotencyKey=text(formData,'idempotency_key'); const amountCents=cents(formData.get('amount')); const {data:existing}=await client.from('payables').select('id').eq('idempotency_key',idempotencyKey).maybeSingle(); if(!existing){ const {data:payable,error}=await client.from('payables').insert({vendor_id:vendorId,category_id:categoryId,description,amount_cents:amountCents,due_date:dueDate,competence,idempotency_key:idempotencyKey}).select('id').single(); if(error||!payable) throw new Error('FINANCE_PAYABLE_CREATE_FAILED'); await audit(client,authorized.userId,'payable.created','payable',payable.id,{vendorId,categoryId,amountCents,dueDate,competence}) } redirect('/financeiro/operacoes') }
export async function payPayableAction(formData: FormData) { const {client}=await context(['psychologist_owner','accounting']); const payableId=text(formData,'payable_id'), method=text(formData,'method'), idempotencyKey=text(formData,'idempotency_key'); const amountCents=cents(formData.get('amount')); if(!PAYMENT_METHODS.has(method)) throw new Error('FINANCE_INVALID_PAYMENT_METHOD'); await financialRpc(client,'record_payable_payment_atomic',{p_payable_id:payableId,p_amount_cents:amountCents,p_method:method,p_idempotency_key:idempotencyKey},'FINANCE_PAYABLE_PAYMENT_CREATE_FAILED'); redirect('/financeiro/operacoes') }
export async function createRecurrenceAction(formData: FormData) { const {authorized,client}=await context(['psychologist_owner','accounting']); const vendorId=text(formData,'vendor_id'), categoryId=text(formData,'category_id'), description=text(formData,'description'), startDate=text(formData,'start_date'), fallback=text(formData,'month_end_fallback'); const amountCents=cents(formData.get('amount')), dayOfMonth=Number(text(formData,'day_of_month')); if(!Number.isInteger(dayOfMonth)||dayOfMonth<1||dayOfMonth>31||!['last_day','reject'].includes(fallback)) throw new Error('FINANCE_RECURRENCE_INVALID'); const {data:rule,error}=await client.from('recurrence_rules').insert({vendor_id:vendorId,category_id:categoryId,description,amount_cents:amountCents,start_date:startDate,day_of_month:dayOfMonth,month_end_fallback:fallback}).select('id').single(); if(error||!rule) throw new Error('FINANCE_RECURRENCE_CREATE_FAILED'); await audit(client,authorized.userId,'payable.recurrence_created','recurrence_rule',rule.id,{vendorId,categoryId,amountCents,startDate,dayOfMonth,fallback}); redirect('/financeiro/operacoes') }

export async function createVendorAction(formData: FormData) {
  const { authorized, client } = await context(['psychologist_owner', 'accounting'])
  const legalName = text(formData, 'legal_name')
  const { data, error } = await client.from('vendors').insert({ legal_name: legalName }).select('id').single()
  if (error || !data) throw new Error('FINANCE_VENDOR_CREATE_FAILED')
  await audit(client, authorized.userId, 'vendor.created', 'vendor', data.id, { legalName })
  redirect('/financeiro/operacoes')
}

export async function createExpenseCategoryAction(formData: FormData) {
  const { authorized, client } = await context(['psychologist_owner', 'accounting'])
  const name = text(formData, 'name')
  const { data, error } = await client.from('expense_categories').insert({ name }).select('id').single()
  if (error || !data) throw new Error('FINANCE_EXPENSE_CATEGORY_CREATE_FAILED')
  await audit(client, authorized.userId, 'expense_category.created', 'expense_category', data.id, { name })
  redirect('/financeiro/operacoes')
}
