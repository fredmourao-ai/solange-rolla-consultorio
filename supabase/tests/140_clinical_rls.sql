begin;

select plan(12);

select has_schema('clinical', 'clinical schema exists');
select has_table('clinical', 'records', 'clinical records exist');
select ok((select relrowsecurity from pg_class where oid = 'clinical.records'::regclass), 'clinical records enable RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'clinical.records'::regclass), 'clinical records force RLS');
select ok(not has_table_privilege('anon', 'clinical.records', 'SELECT'), 'anonymous has no clinical record select privilege');
select ok((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'clinical_records_owner_aal2') like '%psychologist_owner%', 'clinical policy requires owner role');
select ok((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'clinical_records_owner_aal2') like '%aal2%', 'clinical policy requires AAL2');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('40000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'clinical-owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('40000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'clinical-secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('40000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'clinical-accounting@example.test', 'synthetic-password', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('40000000-0000-0000-0000-000000000001', 'psychologist_owner', 'Clinical Owner'),
  ('40000000-0000-0000-0000-000000000002', 'secretary', 'Clinical Secretary'),
  ('40000000-0000-0000-0000-000000000003', 'accounting', 'Clinical Accounting');

insert into clinical.records (id, appointment_id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version)
values ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000001', 'synthetic-ciphertext', 'synthetic-iv', 'synthetic-tag', 1);

set local role anon;
select throws_ok($$ select count(*) from clinical.records $$, '42501', null, 'anonymous cannot read clinical records');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from clinical.records), 0, 'secretary cannot read clinical records');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from clinical.records), 0, 'accounting cannot read clinical records');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::int from clinical.records), 0, 'owner at AAL1 cannot read clinical records');

select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from clinical.records), 1, 'owner at AAL2 can read clinical records');

select * from finish();
rollback;
