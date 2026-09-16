begin;
select plan(11);

select has_function(
  'public',
  'create_recurring_payable_atomic',
  array['uuid','uuid','uuid','text','bigint','date','date','text'],
  'atomic recurring payable RPC exists'
);

insert into public.vendors (id, legal_name)
values ('71000000-0000-4000-8000-000000000001', 'Fornecedor Recorrência Teste');
insert into public.expense_categories (id, name)
values ('72000000-0000-4000-8000-000000000001', 'recorrência-teste');
insert into public.recurrence_rules (
  id, vendor_id, category_id, description, amount_cents, start_date, day_of_month, month_end_fallback, active
) values (
  '73000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000001',
  'Despesa recorrente sintética',
  12345,
  '2026-09-01',
  10,
  'last_day',
  true
);

set local role service_role;
select is(
  public.create_recurring_payable_atomic(
    '71000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000001',
    'Despesa recorrente sintética',
    12345,
    '2026-09-10',
    '2026-09-01',
    'recurrence:73000000-0000-4000-8000-000000000001:2026-09'
  ),
  true,
  'first recurring execution creates the payable'
);
reset role;

select is(
  (select count(*)::int from public.payables where idempotency_key = 'recurrence:73000000-0000-4000-8000-000000000001:2026-09'),
  1,
  'exactly one recurring payable is persisted'
);
select is(
  (select count(*)::int from public.audit_events where correlation_id = 'recurrence:73000000-0000-4000-8000-000000000001:2026-09' and action = 'payable.recurrence_created'),
  1,
  'exactly one recurring audit event is persisted'
);
select ok(
  (select actor_kind = 'system' and actor_user_id is null from public.audit_events where correlation_id = 'recurrence:73000000-0000-4000-8000-000000000001:2026-09'),
  'recurring audit event uses a non-impersonating system actor'
);
select ok(
  (select metadata->>'source' = 'recurrence'
     and metadata->>'recurrenceRuleId' = '73000000-0000-4000-8000-000000000001'
     and metadata->>'competence' = '2026-09'
     and metadata::text not like '%Despesa recorrente sintética%'
   from public.audit_events
   where correlation_id = 'recurrence:73000000-0000-4000-8000-000000000001:2026-09'),
  'recurring audit metadata is sanitized'
);

set local role service_role;
select is(
  public.create_recurring_payable_atomic(
    '71000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000001',
    'Despesa recorrente sintética',
    12345,
    '2026-09-10',
    '2026-09-01',
    'recurrence:73000000-0000-4000-8000-000000000001:2026-09'
  ),
  false,
  'second recurring execution is idempotent'
);
reset role;

select is(
  (select count(*)::int from public.payables where idempotency_key = 'recurrence:73000000-0000-4000-8000-000000000001:2026-09'),
  1,
  'idempotent retry does not duplicate the payable'
);
select is(
  (select count(*)::int from public.audit_events where correlation_id = 'recurrence:73000000-0000-4000-8000-000000000001:2026-09'),
  1,
  'idempotent retry does not duplicate the audit event'
);

set local role authenticated;
select throws_ok(
  $$ select public.create_recurring_payable_atomic(
    '71000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000001',
    'Despesa recorrente sintética',
    12345,
    '2026-09-10',
    '2026-09-01',
    'recurrence:73000000-0000-4000-8000-000000000001:2026-09'
  ) $$,
  '42501',
  null,
  'authenticated clients cannot execute the system-only recurring RPC'
);
reset role;

select throws_ok(
  $$ select public.create_recurring_payable_atomic(
    '71000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000001',
    'Despesa recorrente sintética',
    12345,
    '2026-09-10',
    '2026-09-01',
    'not-the-canonical-idempotency-key'
  ) $$,
  '22023',
  'RECURRING_PAYABLE_INPUT_INVALID',
  'RPC rejects non-canonical idempotency keys'
);

select * from finish();
rollback;
