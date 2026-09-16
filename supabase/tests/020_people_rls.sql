begin;

select plan(19);

select has_table('public', 'people', 'people table exists');
select has_table('public', 'person_relationships', 'person relationships table exists');
select has_view('public', 'accounting_people_view', 'accounting view exists');
select has_column('public', 'people', 'emergency_contact_name', 'people stores emergency contact name');
select has_column('public', 'people', 'emergency_contact_phone_e164', 'people stores emergency contact phone');
select has_column('public', 'people', 'emergency_contact_relationship', 'people stores emergency contact relationship');
select ok((select relrowsecurity from pg_class where oid = 'public.people'::regclass), 'people has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.person_relationships'::regclass), 'relationships have RLS enabled');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'accounting@example.test', 'synthetic-password', now(), '{}', '{}');
insert into public.profiles (user_id, role, display_name)
values
  ('00000000-0000-0000-0000-000000000002', 'secretary', 'Teste Secretary'),
  ('00000000-0000-0000-0000-000000000004', 'accounting', 'Teste Accounting');

insert into public.people (id, civil_name, birth_date, cpf_normalized, fiscal_address)
values ('10000000-0000-0000-0000-000000000001', 'Teste Pessoa', '1990-01-01', '52998224725', '{"city":"Teste"}');

set local role anon;
select throws_ok($$ select count(*) from public.people $$, '42501', null, 'anonymous cannot read people');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.people), 0, 'no-profile authenticated subject cannot read people directly');
select is((select count(*)::int from public.accounting_people_view), 0, 'no-profile authenticated subject cannot read accounting view');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.people), 0, 'accounting cannot read people directly');
select is((select count(*)::int from public.accounting_people_view where id = '10000000-0000-0000-0000-000000000001'), 1, 'accounting can read the test person in the minimum accounting view');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.people where id = '10000000-0000-0000-0000-000000000001'), 1, 'secretary can read the test administrative person');
select is((select count(*)::int from public.accounting_people_view), 0, 'secretary cannot read accounting-only view');
update public.people
set emergency_contact_name = 'Contato Teste',
    emergency_contact_phone_e164 = '+5531987654321',
    emergency_contact_relationship = 'Irmã'
where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select emergency_contact_name || '|' || emergency_contact_phone_e164 || '|' || emergency_contact_relationship from public.people where id = '10000000-0000-0000-0000-000000000001'),
  'Contato Teste|+5531987654321|Irmã',
  'secretary can persist complete emergency contact details'
);
select throws_ok(
  $$ update public.people set emergency_contact_name = 'Sem telefone', emergency_contact_phone_e164 = null where id = '10000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'emergency contact name requires phone'
);
select throws_ok(
  $$ update public.people set emergency_contact_name = null, emergency_contact_phone_e164 = '+5531987654321' where id = '10000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'emergency contact phone requires name'
);
reset role;
select ok(
  (select metadata->>'emergencyContactChanged' = 'true'
     and metadata->>'identityChanged' = 'false'
     and metadata->>'contactChanged' = 'false'
     and metadata->>'preferencesChanged' = 'false'
     and metadata->>'fiscalChanged' = 'false'
     and metadata::text not like '%Contato Teste%'
     and metadata::text not like '%5531987654321%'
   from public.audit_events
   where action = 'person.updated' and entity_id = '10000000-0000-0000-0000-000000000001'
   order by created_at desc limit 1),
  'person update audit records sanitized change categories without emergency contact PII'
);

select * from finish();
rollback;
