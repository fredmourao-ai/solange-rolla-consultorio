begin;

select plan(13);

select policies_are('clinical', 'records', array['clinical_records_select_authorized','clinical_records_insert_authorized'], 'clinical records expose only separated read/create policies');
select ok((select relforcerowsecurity from pg_class where oid='clinical.records'::regclass), 'clinical records continue forcing RLS');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
 ('f5000000-0000-4000-8000-000000000001','authenticated','authenticated','clinical-denied@example.test','synthetic',now(),'{}','{}'),
 ('f5000000-0000-4000-8000-000000000002','authenticated','authenticated','clinical-secretary@example.test','synthetic',now(),'{}','{}');

insert into public.profiles (user_id,role,display_name,active)
values
 ('f5000000-0000-4000-8000-000000000001','psychologist_owner','Profissional sem permissão clínica',true),
 ('f5000000-0000-4000-8000-000000000002','secretary','Secretaria clínica negativa',true);

insert into public.user_permission_overrides(user_id,permission_key,allowed,changed_by_user_id)
values
 ('f5000000-0000-4000-8000-000000000001','clinical.read',false,'f5000000-0000-4000-8000-000000000001'),
 ('f5000000-0000-4000-8000-000000000001','clinical.create',false,'f5000000-0000-4000-8000-000000000001');

insert into public.appointments (
  id,person_id,service_id,starts_at,ends_at,status,policy_version,
  cancellation_deadline_at,business_timezone,cancellation_policy_snapshot
) values (
  'f5100000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd0200000-0000-4000-8000-000000000001',
  now(), now()+interval '50 minutes','confirmed',1,
  now()-interval '1 day','America/Sao_Paulo','{"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
);

insert into clinical.records(
  id,appointment_id,person_id,author_user_id,ciphertext,iv,auth_tag,key_version
) values (
  'f5200000-0000-4000-8000-000000000001',
  'f5100000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'f5000000-0000-4000-8000-000000000001',
  'ciphertext-fixture','iv-fixture','tag-fixture',1
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

select is((select count(*)::integer from public.list_clinical_record_metadata('d0000000-0000-4000-8000-000000000001')),0,'AAL2 owner with clinical.read denied receives no metadata');
select is((select count(*)::integer from public.get_clinical_record_envelope('f5200000-0000-4000-8000-000000000001')),0,'AAL2 owner with clinical.read denied receives no envelope');
select throws_ok(
  $$ select * from public.create_clinical_record('f5200000-0000-4000-8000-000000000002','f5100000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','x','y','z',1,null) $$,
  '42501','CLINICAL_PERMISSION_FORBIDDEN','clinical.create deny blocks direct RPC'
);
select is((select count(*)::integer from public.audit_events where entity_id='f5200000-0000-4000-8000-000000000001'),0,'denied clinical read emits no misleading viewed audit event');

select set_config('request.jwt.claims','{"sub":"f5000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::integer from public.list_clinical_record_metadata('d0000000-0000-4000-8000-000000000001')),0,'secretary receives no clinical metadata');
select is((select count(*)::integer from public.get_clinical_record_envelope('f5200000-0000-4000-8000-000000000001')),0,'secretary receives no clinical envelope');
select throws_ok(
  $$ select * from public.create_clinical_record('f5200000-0000-4000-8000-000000000003','f5100000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002','x','y','z',1,null) $$,
  '42501','CLINICAL_PERMISSION_FORBIDDEN','secretary cannot create clinical record through direct RPC'
);
select is((select count(*)::integer from clinical.records),0,'secretary RLS exposes zero clinical rows');

reset role;
select throws_ok(
  $$ update clinical.records set ciphertext='changed' where id='f5200000-0000-4000-8000-000000000001' $$,
  '55000','CLINICAL_RECORD_IMMUTABLE','clinical content remains immutable on update'
);
select throws_ok(
  $$ delete from clinical.records where id='f5200000-0000-4000-8000-000000000001' $$,
  '55000','CLINICAL_RECORD_IMMUTABLE','clinical content remains immutable on delete'
);
select is((select count(*)::integer from clinical.records where id='f5200000-0000-4000-8000-000000000001'),1,'original clinical record remains stored after blocked mutations');

select * from finish();
rollback;
