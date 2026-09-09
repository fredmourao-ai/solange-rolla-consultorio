-- owners: receivables,payables,audit
-- cross-module-task: docs/task-contracts/financial-atomic-mutations-105.json
-- allow-static-routines: true

create or replace function public.refresh_receivable_status_atomic(p_receivable_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  original_cents bigint;
  current_status text;
  adjustment_cents bigint;
  paid_cents bigint;
  refunded_cents bigint;
  charge_cents bigint;
  net_paid_cents bigint;
  next_status text;
begin
  select original_amount_cents, status
  into original_cents, current_status
  from public.receivables
  where id = p_receivable_id;

  if not found then
    raise exception 'FINANCE_RECEIVABLE_NOT_FOUND';
  end if;
  select coalesce(sum(adjustment_cents), 0)
  into adjustment_cents
  from public.receivable_adjustments
  where receivable_id = p_receivable_id;

  select coalesce(sum(amount_cents), 0)
  into paid_cents
  from public.payments
  where receivable_id = p_receivable_id;

  select coalesce(sum(amount_cents), 0)
  into refunded_cents
  from public.payment_refunds
  where payment_id in (
    select id from public.payments where receivable_id = p_receivable_id
  );

  charge_cents := greatest(0, original_cents + adjustment_cents);
  net_paid_cents := paid_cents - refunded_cents;

  next_status := case
    when current_status = 'voided' then 'voided'
    when charge_cents <= 0 and net_paid_cents > 0 then 'refund_due'
    when charge_cents <= 0 then 'voided'
    when net_paid_cents > charge_cents then 'refund_due'
    when net_paid_cents = charge_cents then 'paid'
    when refunded_cents > 0 and net_paid_cents <= 0 then 'refunded'
    when current_status = 'overdue' then 'overdue'
    when net_paid_cents > 0 then 'partial'
    else 'open'
  end;
  update public.receivables
  set status = next_status
  where id = p_receivable_id;

  return next_status;
end;
$$;

revoke all on function public.refresh_receivable_status_atomic(uuid)
from public, anon, authenticated;

create or replace function public.record_receivable_payment_atomic(
  p_receivable_id uuid,
  p_amount_cents bigint,
  p_method text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  role_name text := public.current_app_role();
  existing public.payments%rowtype;
  locked_receivable public.receivables%rowtype;
  adjustment_cents bigint;
  paid_cents bigint;
  refunded_cents bigint;
  charge_cents bigint;
  net_paid_cents bigint;
  payment_id uuid;
begin  if actor is null or role_name <> 'psychologist_owner' then
    raise exception 'FINANCE_PAYMENT_FORBIDDEN';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'FINANCE_INVALID_AMOUNT';
  end if;
  if p_method not in ('pix','cash','debit_card','credit_card','bank_transfer','other') then
    raise exception 'FINANCE_INVALID_PAYMENT_METHOD';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'FINANCE_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into existing from public.payments
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.receivable_id <> p_receivable_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  select * into locked_receivable
  from public.receivables
  where id = p_receivable_id
  for update;
  if not found then
    raise exception 'FINANCE_RECEIVABLE_NOT_FOUND';
  end if;
  select * into existing from public.payments
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.receivable_id <> p_receivable_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  select coalesce(sum(adjustment_cents), 0)
  into adjustment_cents
  from public.receivable_adjustments
  where receivable_id = p_receivable_id;

  select coalesce(sum(amount_cents), 0)
  into paid_cents
  from public.payments
  where receivable_id = p_receivable_id;

  select coalesce(sum(amount_cents), 0)
  into refunded_cents
  from public.payment_refunds
  where payment_id in (
    select id from public.payments where receivable_id = p_receivable_id
  );

  charge_cents := greatest(0, locked_receivable.original_amount_cents + adjustment_cents);
  net_paid_cents := paid_cents - refunded_cents;
  if p_amount_cents > greatest(0, charge_cents - net_paid_cents) then
    raise exception 'PAYMENT_EXCEEDS_BALANCE';
  end if;
  insert into public.payments (
    receivable_id, amount_cents, method, idempotency_key, actor_id
  ) values (
    p_receivable_id, p_amount_cents, p_method, p_idempotency_key, actor
  )
  on conflict (idempotency_key) do nothing
  returning id into payment_id;

  if payment_id is null then
    select * into existing from public.payments
    where idempotency_key = p_idempotency_key;
    if existing.id is null
       or existing.receivable_id <> p_receivable_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  perform public.refresh_receivable_status_atomic(p_receivable_id);
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    actor, 'payment.recorded', 'payment', payment_id, payment_id::text,
    jsonb_build_object('receivableId', p_receivable_id, 'amountCents', p_amount_cents, 'method', p_method)
  );

  return payment_id;
end;
$$;revoke all on function public.record_receivable_payment_atomic(uuid, bigint, text, text)
from public, anon;
grant execute on function public.record_receivable_payment_atomic(uuid, bigint, text, text)
to authenticated;

create or replace function public.refund_receivable_payment_atomic(
  p_payment_id uuid,
  p_amount_cents bigint,
  p_method text,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  role_name text := public.current_app_role();
  existing public.payment_refunds%rowtype;
  payment_row public.payments%rowtype;
  locked_receivable public.receivables%rowtype;
  prior_refunds bigint;
  refund_id uuid;
begin
  if actor is null or role_name <> 'psychologist_owner' then
    raise exception 'FINANCE_REFUND_FORBIDDEN';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'FINANCE_INVALID_AMOUNT';
  end if;  if p_method not in ('pix','cash','debit_card','credit_card','bank_transfer','other') then
    raise exception 'FINANCE_INVALID_PAYMENT_METHOD';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'FINANCE_REFUND_REASON_REQUIRED';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'FINANCE_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into existing from public.payment_refunds
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.payment_id <> p_payment_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method
       or existing.reason <> btrim(p_reason) then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  select * into payment_row
  from public.payments
  where id = p_payment_id;
  if not found then
    raise exception 'FINANCE_PAYMENT_NOT_FOUND';
  end if;

  select * into locked_receivable
  from public.receivables
  where id = payment_row.receivable_id
  for update;  if not found then
    raise exception 'FINANCE_RECEIVABLE_NOT_FOUND';
  end if;

  select * into payment_row
  from public.payments
  where id = p_payment_id;
  if not found then
    raise exception 'FINANCE_PAYMENT_NOT_FOUND';
  end if;

  select * into existing from public.payment_refunds
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.payment_id <> p_payment_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method
       or existing.reason <> btrim(p_reason) then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  select coalesce(sum(amount_cents), 0)
  into prior_refunds
  from public.payment_refunds
  where payment_id = p_payment_id;

  if prior_refunds + p_amount_cents > payment_row.amount_cents then
    raise exception 'FINANCE_REFUND_EXCEEDS_PAYMENT';
  end if;  insert into public.payment_refunds (
    payment_id, amount_cents, method, reason, idempotency_key, actor_id
  ) values (
    p_payment_id, p_amount_cents, p_method, btrim(p_reason), p_idempotency_key, actor
  )
  on conflict (idempotency_key) do nothing
  returning id into refund_id;

  if refund_id is null then
    select * into existing from public.payment_refunds
    where idempotency_key = p_idempotency_key;
    if existing.id is null
       or existing.payment_id <> p_payment_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method
       or existing.reason <> btrim(p_reason) then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  perform public.refresh_receivable_status_atomic(payment_row.receivable_id);
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    actor, 'payment.refunded', 'payment_refund', refund_id, refund_id::text,
    jsonb_build_object('paymentId', p_payment_id, 'amountCents', p_amount_cents, 'reason', btrim(p_reason))
  );

  return refund_id;
end;
$$;revoke all on function public.refund_receivable_payment_atomic(uuid, bigint, text, text, text)
from public, anon;
grant execute on function public.refund_receivable_payment_atomic(uuid, bigint, text, text, text)
to authenticated;

create or replace function public.record_payable_payment_atomic(
  p_payable_id uuid,
  p_amount_cents bigint,
  p_method text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  role_name text := public.current_app_role();
  existing public.payable_payments%rowtype;
  payable_row public.payables%rowtype;
  payment_id uuid;
  next_paid bigint;
begin
  if actor is null or role_name not in ('psychologist_owner', 'accounting') then
    raise exception 'FINANCE_PAYABLE_PAYMENT_FORBIDDEN';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'FINANCE_INVALID_AMOUNT';
  end if;
  if p_method not in ('pix','cash','debit_card','credit_card','bank_transfer','other') then
    raise exception 'FINANCE_INVALID_PAYMENT_METHOD';
  end if;  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'FINANCE_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into existing from public.payable_payments
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.payable_id <> p_payable_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  select * into payable_row
  from public.payables
  where id = p_payable_id
  for update;
  if not found then
    raise exception 'FINANCE_PAYABLE_NOT_FOUND';
  end if;
  if payable_row.status = 'voided' then
    raise exception 'FINANCE_PAYABLE_PAYMENT_INVALID';
  end if;

  select * into existing from public.payable_payments
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.payable_id <> p_payable_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;    return existing.id;
  end if;

  if p_amount_cents > payable_row.amount_cents - payable_row.paid_cents then
    raise exception 'FINANCE_PAYABLE_PAYMENT_INVALID';
  end if;

  insert into public.payable_payments (
    payable_id, amount_cents, method, idempotency_key, actor_id
  ) values (
    p_payable_id, p_amount_cents, p_method, p_idempotency_key, actor
  )
  on conflict (idempotency_key) do nothing
  returning id into payment_id;

  if payment_id is null then
    select * into existing from public.payable_payments
    where idempotency_key = p_idempotency_key;
    if existing.id is null
       or existing.payable_id <> p_payable_id
       or existing.amount_cents <> p_amount_cents
       or existing.method <> p_method then
      raise exception 'FINANCE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing.id;
  end if;

  next_paid := payable_row.paid_cents + p_amount_cents;
  update public.payables
  set paid_cents = next_paid,
      status = case when next_paid = amount_cents then 'paid' else 'partial' end
  where id = p_payable_id;  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    actor, 'payable.payment_recorded', 'payable_payment', payment_id, payment_id::text,
    jsonb_build_object('payableId', p_payable_id, 'amountCents', p_amount_cents, 'method', p_method)
  );

  return payment_id;
end;
$$;

revoke all on function public.record_payable_payment_atomic(uuid, bigint, text, text)
from public, anon;
grant execute on function public.record_payable_payment_atomic(uuid, bigint, text, text)
to authenticated;