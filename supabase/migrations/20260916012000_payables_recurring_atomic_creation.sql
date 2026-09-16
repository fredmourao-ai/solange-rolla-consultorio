-- owners: audit,payables
-- cross-module-task: docs/task-contracts/payables-recurring-atomic-creation.json
-- allow-static-routines: true

create or replace function public.create_recurring_payable_atomic(
  p_vendor_id uuid,
  p_category_id uuid,
  p_recurrence_rule_id uuid,
  p_description text,
  p_amount_cents bigint,
  p_due_date date,
  p_competence date,
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payable_id uuid;
begin
  if p_recurrence_rule_id is null
    or p_amount_cents is null or p_amount_cents <= 0
    or p_description is null or btrim(p_description) = ''
    or p_due_date is null
    or p_competence is null
    or date_part('day', p_competence) <> 1
    or to_char(p_due_date, 'YYYY-MM') <> to_char(p_competence, 'YYYY-MM')
    or p_idempotency_key <> format('recurrence:%s:%s', p_recurrence_rule_id, to_char(p_competence, 'YYYY-MM')) then
    raise exception 'RECURRING_PAYABLE_INPUT_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.recurrence_rules as r
    where r.id = p_recurrence_rule_id
      and r.active
      and r.vendor_id = p_vendor_id
      and r.category_id = p_category_id
      and r.description = p_description
      and r.amount_cents = p_amount_cents
      and p_due_date >= r.start_date
  ) then
    raise exception 'RECURRING_PAYABLE_RULE_MISMATCH' using errcode = '22023';
  end if;

  insert into public.payables (
    vendor_id,
    category_id,
    recurrence_rule_id,
    description,
    amount_cents,
    due_date,
    competence,
    idempotency_key
  )
  values (
    p_vendor_id,
    p_category_id,
    p_recurrence_rule_id,
    p_description,
    p_amount_cents,
    p_due_date,
    p_competence,
    p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_payable_id;

  if v_payable_id is null then
    return false;
  end if;

  insert into public.audit_events (
    actor_user_id,
    actor_kind,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  )
  values (
    null,
    'system',
    'payable.recurrence_created',
    'payable',
    v_payable_id,
    p_idempotency_key,
    jsonb_build_object(
      'source', 'recurrence',
      'recurrenceRuleId', p_recurrence_rule_id::text,
      'competence', to_char(p_competence, 'YYYY-MM')
    )
  );

  return true;
end;
$$;

revoke all on function public.create_recurring_payable_atomic(uuid,uuid,uuid,text,bigint,date,date,text) from public, anon, authenticated;
grant execute on function public.create_recurring_payable_atomic(uuid,uuid,uuid,text,bigint,date,date,text) to service_role;
