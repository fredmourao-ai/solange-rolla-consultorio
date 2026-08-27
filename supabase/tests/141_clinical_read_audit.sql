begin;

select plan(8);

select has_function('public', 'get_clinical_record_envelope', 'clinical envelope RPC exists');
select ok(not has_function_privilege('anon', 'public.get_clinical_record_envelope(uuid)', 'EXECUTE'), 'anonymous cannot execute clinical envelope RPC');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'clinical-rpc-owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('41000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'clinical-rpc-secretary@example.test', 'synthetic-password', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('41000000-0000-0000-0000-000000000001', 'psychologist_owner', 'Clinical RPC Owner'),
  ('41000000-0000-0000-0000-000000000002', 'secretary', 'Clinical RPC Secretary');

insert into clinical.records (id, appointment_id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version)
values ('41000000-0000-0000-0000-000000000010', '41000000-0000-0000-0000-000000000011', '41000000-0000-0000-0000-000000000012', '41000000-0000-0000-0000-000000000001', 'synthetic-ciphertext', 'synthetic-iv', 'synthetic-tag', 1);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::int from public.get_clinical_record_envelope('41000000-0000-0000-0000-000000000010')), 0, 'owner at AAL1 cannot read through clinical RPC');
select is((select count(*)::int from public.audit_events where action = 'clinical_record.viewed'), 0, 'denied clinical read is not audited as a view');

select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.get_clinical_record_envelope('41000000-0000-0000-0000-000000000010')), 0, 'secretary cannot read through clinical RPC');

select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.get_clinical_record_envelope('41000000-0000-0000-0000-000000000010')), 1, 'owner at AAL2 can read through clinical RPC');
select is((select count(*)::int from public.audit_events where action = 'clinical_record.viewed'), 1, 'approved clinical read creates one audit event');
select is((select metadata->>'record_id' from public.audit_events where action = 'clinical_record.viewed' limit 1), '41000000-0000-0000-0000-000000000010', 'clinical read audit stores only record identifier');

select * from finish();
rollback;
