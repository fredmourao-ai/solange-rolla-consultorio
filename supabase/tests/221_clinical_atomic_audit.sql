begin;

select plan(8);

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values (
  'f6000000-0000-4000-8000-000000000001','authenticated','authenticated',
  'clinical-atomic-owner@example.test','synthetic',now(),'{}','{}'
);

insert into public.profiles (user_id,role,display_name,active)
values ('f6000000-0000-4000-8000-000000000001','psychologist_owner','Clinical Atomic Owner',true);

insert into public.appointments (
  id,person_id,service_id,starts_at,ends_at,status,policy_version,
  cancellation_deadline_at,business_timezone,cancellation_policy_snapshot
) values (
  'f6100000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd0200000-0000-4000-8000-000000000001',
  now(), now()+interval '50 minutes','in_progress',1,
  now()-interval '1 day','America/Sao_Paulo',
  '{"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f6000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select * from public.create_clinical_record(
    'f6200000-0000-4000-8000-000000000001',
    'f6100000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001',
    'f6000000-0000-4000-8000-000000000001',
    'cipher-atomic','iv-atomic','tag-atomic',1,null
  ) $$,
  'authorized clinical record creation succeeds'
);

select is(
  (select count(*)::integer from public.audit_events
   where entity_type='clinical_record'
     and entity_id='f6200000-0000-4000-8000-000000000001'),
  1,
  'clinical record creation emits exactly one audit event in the RPC'
);

select is(
  (select action from public.audit_events
   where entity_type='clinical_record'
     and entity_id='f6200000-0000-4000-8000-000000000001'),
  'clinical_record.created',
  'clinical record audit action preserves the existing contract'
);

select ok(
  (select metadata::text not like '%cipher-atomic%'
   from public.audit_events
   where entity_type='clinical_record'
     and entity_id='f6200000-0000-4000-8000-000000000001'),
  'clinical audit metadata contains no ciphertext'
);

select is(
  (select metadata->>'personId' from public.audit_events
   where entity_type='clinical_record'
     and entity_id='f6200000-0000-4000-8000-000000000001'),
  'd0000000-0000-4000-8000-000000000001',
  'clinical audit metadata keeps only the patient identifier'
);

reset role;

create or replace function public.test_reject_clinical_atomic_audit()
returns trigger
language plpgsql
as $$
begin
  if new.entity_id = 'f6200000-0000-4000-8000-000000000002' then
    raise exception 'SYNTHETIC_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger test_reject_clinical_atomic_audit
before insert on public.audit_events
for each row execute function public.test_reject_clinical_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f6000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select * from public.create_clinical_record(
    'f6200000-0000-4000-8000-000000000002',
    'f6100000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001',
    'f6000000-0000-4000-8000-000000000001',
    'cipher-rollback','iv-rollback','tag-rollback',1,
    'f6200000-0000-4000-8000-000000000001'
  ) $$,
  '55000',
  'SYNTHETIC_AUDIT_FAILURE',
  'audit failure aborts the clinical mutation'
);

reset role;

select is(
  (select count(*)::integer from clinical.records
   where id='f6200000-0000-4000-8000-000000000002'),
  0,
  'clinical record is rolled back when its audit insert fails'
);

select is(
  (select count(*)::integer from clinical.records
   where id='f6200000-0000-4000-8000-000000000001'),
  1,
  'previous successfully audited clinical record remains stored'
);

select * from finish();
rollback;
