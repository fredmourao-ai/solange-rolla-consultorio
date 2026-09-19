begin;

select plan(16);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data
) values (
  'fa000000-0000-4000-8000-000000000001','authenticated','authenticated',
  'atomic-owner@example.test','synthetic',now(),'{}','{}'
);
insert into public.profiles (user_id,role,display_name,active)
values ('fa000000-0000-4000-8000-000000000001','psychologist_owner','Atomic Owner',true);

-- Prepare rows that must exist before the synthetic audit failure trigger.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fa000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

insert into public.appointments (
  id,person_id,service_id,starts_at,ends_at,status,policy_version,
  cancellation_deadline_at,business_timezone,cancellation_policy_snapshot
) values (
  'fa100000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd0200000-0000-4000-8000-000000000001',
  now()+interval '2 days',now()+interval '2 days 50 minutes','confirmed',1,
  now()+interval '1 day','America/Sao_Paulo',
  '{"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
);
insert into public.events (
  id,title,type,starts_at,ends_at,timezone,modality,capacity,default_price_cents,status
) values (
  'fa200000-0000-4000-8000-000000000001','Atomic Event','group',
  now()+interval '3 days',now()+interval '3 days 2 hours','America/Sao_Paulo',
  'in_person',10,2500,'open'
);
insert into public.receivables (
  id,source_type,source_id,person_id,payer_person_id,original_amount_cents,idempotency_key,status
) values (
  'fa300000-0000-4000-8000-000000000001','test',
  'fa300000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  10000,'atomic-adjustment-base','open'
);
reset role;

create or replace function public.test_reject_business_atomic_audit()
returns trigger
language plpgsql
as $$
begin
  if new.action in (
    'appointment.created',
    'appointment.status_changed',
    'event.created',
    'event.registration_created',
    'receivable.adjusted',
    'payable.created',
    'form_template.created',
    'form.capability_issued'
  ) and (
    new.entity_id in (
      'fa110000-0000-4000-8000-000000000001',
      'fa100000-0000-4000-8000-000000000001',
      'fa210000-0000-4000-8000-000000000001',
      'fa400000-0000-4000-8000-000000000001',
      'fa500000-0000-4000-8000-000000000001'
    )
    or new.action in ('event.registration_created','receivable.adjusted','payable.created')
  ) then
    raise exception 'SYNTHETIC_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger test_reject_business_atomic_audit
before insert on public.audit_events
for each row execute function public.test_reject_business_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fa000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok(
  $$ insert into public.appointments (
    id,person_id,service_id,starts_at,ends_at,status,policy_version,
    cancellation_deadline_at,business_timezone,cancellation_policy_snapshot
  ) values (
    'fa110000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001',
    'd0200000-0000-4000-8000-000000000001',
    now()+interval '4 days',now()+interval '4 days 50 minutes','scheduled',1,
    now()+interval '2 days','America/Sao_Paulo',
    '{"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'appointment audit failure aborts appointment insert'
);
select is(
  (select count(*)::integer from public.appointments where id='fa110000-0000-4000-8000-000000000001'),0,
  'failed appointment insert leaves no business row'
);

select throws_ok(
  $$ select public.change_appointment_status_atomic(
    'fa100000-0000-4000-8000-000000000001','confirmed','checked_in','check_in'
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'appointment status audit failure aborts status transaction'
);
select is(
  (select status from public.appointments where id='fa100000-0000-4000-8000-000000000001'),
  'confirmed',
  'failed status audit preserves previous appointment status'
);

select throws_ok(
  $$ insert into public.events (
    id,title,type,starts_at,ends_at,timezone,modality,capacity,default_price_cents,status
  ) values (
    'fa210000-0000-4000-8000-000000000001','Rejected Event','group',
    now()+interval '5 days',now()+interval '5 days 2 hours','America/Sao_Paulo',
    'in_person',5,0,'open'
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'event audit failure aborts event creation'
);
select is(
  (select count(*)::integer from public.events where id='fa210000-0000-4000-8000-000000000001'),0,
  'failed event audit leaves no event row'
);

select throws_ok(
  $$ select * from public.register_event_participant_atomic(
    'fa200000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000002',
    2500,'pending_payment'
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'registration audit failure aborts registration and receivable transaction'
);
select is(
  (select count(*)::integer from public.event_registrations
   where event_id='fa200000-0000-4000-8000-000000000001'
     and person_id='d0000000-0000-4000-8000-000000000002'),0,
  'failed registration audit leaves no registration'
);

select throws_ok(
  $$ select public.record_receivable_adjustment_atomic(
    'fa300000-0000-4000-8000-000000000001',-1000,'atomic rollback'
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'adjustment audit failure aborts financial transaction'
);
select is(
  (select count(*)::integer from public.receivable_adjustments
   where receivable_id='fa300000-0000-4000-8000-000000000001'),0,
  'failed adjustment audit leaves no adjustment'
);

select throws_ok(
  $$ insert into public.payables (
    id,vendor_id,category_id,description,amount_cents,due_date,competence,idempotency_key
  ) select
    gen_random_uuid(),v.id,c.id,'Rejected payable',1000,current_date+10,date_trunc('month',current_date)::date,'atomic-payable-reject'
  from public.vendors v cross join public.expense_categories c
  limit 1 $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'payable audit failure aborts payable creation'
);
select is(
  (select count(*)::integer from public.payables where idempotency_key='atomic-payable-reject'),0,
  'failed payable audit leaves no payable'
);

select throws_ok(
  $$ select public.create_form_template_atomic(
    'fa400000-0000-4000-8000-000000000001',
    'fa410000-0000-4000-8000-000000000001',
    'Rejected template','administrative',
    '{"fields":[{"key":"name","type":"short_text","required":true,"label":"Name"}]}'::jsonb
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'template audit failure aborts template and version transaction'
);
select is(
  (select count(*)::integer from public.form_templates where id='fa400000-0000-4000-8000-000000000001'),0,
  'failed template audit leaves no template'
);

select throws_ok(
  $$ select public.issue_form_capability_atomic(
    'fa500000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001',
    'd5010000-0000-4000-8000-000000000001',
    repeat('a',64),
    now()+interval '1 hour'
  ) $$,
  '55000','SYNTHETIC_AUDIT_FAILURE',
  'capability audit failure aborts submission and capability transaction'
);
select is(
  (select count(*)::integer from public.form_submissions where id='fa500000-0000-4000-8000-000000000001'),0,
  'failed capability audit leaves no submission'
);

select * from finish();
rollback;
