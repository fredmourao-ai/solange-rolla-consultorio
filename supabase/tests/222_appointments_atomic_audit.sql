begin;

select plan(12);

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
  ('f7000000-0000-4000-8000-000000000001','authenticated','authenticated','agenda-atomic-owner@example.test','synthetic',now(),'{}','{}'),
  ('f7000000-0000-4000-8000-000000000002','authenticated','authenticated','agenda-atomic-accounting@example.test','synthetic',now(),'{}','{}');

insert into public.profiles (user_id,role,display_name,active)
values
  ('f7000000-0000-4000-8000-000000000001','psychologist_owner','Agenda Atomic Owner',true),
  ('f7000000-0000-4000-8000-000000000002','accounting','Agenda Atomic Accounting',true);

insert into public.people (id,full_name,email,phone,status)
values ('f7100000-0000-4000-8000-000000000001','Agenda Atomic Patient','agenda-atomic-patient@example.test','+5537999999999','active');

insert into public.services (id,name,duration_minutes,price_cents,active)
values ('f7200000-0000-4000-8000-000000000001','Agenda Atomic Service',50,15000,true);

insert into public.cancellation_policies (
  id,policy_version,countable_hours,excluded_weekdays,business_timezone,
  late_cancellation_charge_enabled,no_show_charge_enabled,effective_from
) values (
  'f7300000-0000-4000-8000-000000000001',77,48,'[0,6]'::jsonb,'America/Sao_Paulo',
  true,true,'2026-01-01T00:00:00Z'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f7000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.create_appointment_atomic(
    'f7400000-0000-4000-8000-000000000001',
    'f7100000-0000-4000-8000-000000000001',
    'f7200000-0000-4000-8000-000000000001',
    '2035-01-20T18:00:00Z','2035-01-20T18:50:00Z',77,
    '2035-01-18T18:00:00Z','America/Sao_Paulo',
    '{"policyVersion":77,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  ) $$,
  'authorized create is atomic'
);
select is((select count(*)::int from public.audit_events where entity_id='f7400000-0000-4000-8000-000000000001' and action='appointment.created'),1,'create emits exactly one audit');
select is((select status from public.appointments where id='f7400000-0000-4000-8000-000000000001'),'scheduled','create persists scheduled appointment');

reset role;
create or replace function public.test_reject_appointment_audit()
returns trigger
language plpgsql
as $$
begin
  if new.entity_id in (
    'f7400000-0000-4000-8000-000000000002',
    'f7400000-0000-4000-8000-000000000001'
  ) and new.action in ('appointment.created','appointment.updated') then
    raise exception 'SYNTHETIC_APPOINTMENT_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger test_reject_appointment_audit
before insert on public.audit_events
for each row execute function public.test_reject_appointment_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f7000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.create_appointment_atomic(
    'f7400000-0000-4000-8000-000000000002',
    'f7100000-0000-4000-8000-000000000001',
    'f7200000-0000-4000-8000-000000000001',
    '2035-01-21T18:00:00Z','2035-01-21T18:50:00Z',77,
    '2035-01-19T18:00:00Z','America/Sao_Paulo',
    '{"policyVersion":77}'::jsonb
  ) $$,
  '55000','SYNTHETIC_APPOINTMENT_AUDIT_FAILURE',
  'audit failure rolls back create'
);
select is((select count(*)::int from public.appointments where id='f7400000-0000-4000-8000-000000000002'),0,'failed create leaves no appointment');

select throws_ok(
  $$ select public.update_appointment_atomic(
    'f7400000-0000-4000-8000-000000000001',
    'f7100000-0000-4000-8000-000000000001',
    'f7200000-0000-4000-8000-000000000001',
    '2035-01-22T18:00:00Z','2035-01-22T18:50:00Z','scheduled',
    '2035-01-20T18:00:00Z'
  ) $$,
  '55000','SYNTHETIC_APPOINTMENT_AUDIT_FAILURE',
  'audit failure rolls back update'
);
select is((select starts_at::text from public.appointments where id='f7400000-0000-4000-8000-000000000001'),'2035-01-20 18:00:00+00','failed update preserves appointment');
select is((select count(*)::int from public.appointment_status_history where appointment_id='f7400000-0000-4000-8000-000000000001'),0,'failed update leaves no status history');

reset role;
drop trigger test_reject_appointment_audit on public.audit_events;
drop function public.test_reject_appointment_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f7000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);
update public.appointments set status='reschedule_requested' where id='f7400000-0000-4000-8000-000000000001';
select lives_ok(
  $$ select public.update_appointment_atomic(
    'f7400000-0000-4000-8000-000000000001',
    'f7100000-0000-4000-8000-000000000001',
    'f7200000-0000-4000-8000-000000000001',
    '2035-01-23T18:00:00Z','2035-01-23T18:50:00Z','rescheduled',
    '2035-01-21T18:00:00Z'
  ) $$,
  'authorized reschedule update is atomic'
);
select is((select count(*)::int from public.appointment_status_history where appointment_id='f7400000-0000-4000-8000-000000000001' and from_status='reschedule_requested' and to_status='rescheduled'),1,'successful reschedule writes one history row');
select is((select count(*)::int from public.audit_events where entity_id='f7400000-0000-4000-8000-000000000001' and action='appointment.updated'),1,'successful update writes one audit');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f7000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.create_appointment_atomic(
    'f7400000-0000-4000-8000-000000000003',
    'f7100000-0000-4000-8000-000000000001',
    'f7200000-0000-4000-8000-000000000001',
    '2035-01-24T18:00:00Z','2035-01-24T18:50:00Z',77,
    '2035-01-22T18:00:00Z','America/Sao_Paulo','{"policyVersion":77}'::jsonb
  ) $$,
  '42501','APPOINTMENT_CREATE_FORBIDDEN',
  'accounting cannot create appointment'
);

reset role;
select * from finish();
rollback;
