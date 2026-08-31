begin;
select plan(4);

insert into public.appointments
  (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot)
values
  ('a8800000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','d0200000-0000-4000-8000-000000000001',
   clock_timestamp()+interval '2 days',clock_timestamp()+interval '2 days 50 minutes','pending_confirmation',1,
   clock_timestamp()+interval '1 day','America/Sao_Paulo','{}'::jsonb);
insert into public.capabilities (id,token_hash,purpose,subject_type,subject_id,expires_at,used_at)
values ('a8810000-0000-4000-8000-000000000001',repeat('b',64),'appointment_response','appointment','a8800000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour',clock_timestamp());

select ok(has_function_privilege('service_role','public.persist_appointment_response(uuid,text,text,uuid,text)','execute'), 'service role can execute atomic response');
set local role service_role;
select is(public.persist_appointment_response(
  'a8800000-0000-4000-8000-000000000001','pending_confirmation','confirmed',
  'a8810000-0000-4000-8000-000000000001','confirmed'
), 'confirmed', 'response updates status and records history atomically');
reset role;

select is((select count(*) from public.appointment_confirmations where appointment_id='a8800000-0000-4000-8000-000000000001'), 1::bigint, 'one response history row exists');
select throws_ok($$select public.persist_appointment_response(
  'a8800000-0000-4000-8000-000000000001','pending_confirmation','cancelled_in_time',
  'a8810000-0000-4000-8000-000000000001','cancelled')$$, 'APPOINTMENT_STATE_CHANGED', 'stale response cannot overwrite current state');

select * from finish();
rollback;
