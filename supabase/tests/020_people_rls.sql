begin;

select plan(9);

select has_table('public', 'people', 'people table exists');
select has_table('public', 'person_relationships', 'person relationships table exists');
select has_view('public', 'accounting_people_view', 'accounting view exists');
select ok((select relrowsecurity from pg_class where oid = 'public.people'::regclass), 'people has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.person_relationships'::regclass), 'relationships have RLS enabled');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'secretary@example.test', 'synthetic-password', now(), '{}', '{}');
insert into public.profiles (user_id, role, display_name)
values ('00000000-0000-0000-0000-000000000002', 'secretary', 'Teste Secretary');

insert into public.people (id, civil_name, birth_date, cpf_normalized, fiscal_address)
values ('10000000-0000-0000-0000-000000000001', 'Teste Pessoa', '1990-01-01', '52998224725', '{"city":"Teste"}');

set local role anon;
select throws_ok($$ select count(*) from public.people $$, '42501', null, 'anonymous cannot read people');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.people), 0, 'accounting cannot read people directly');
select is((select count(*)::int from public.accounting_people_view where id = '10000000-0000-0000-0000-000000000001'), 1, 'accounting can read the test person in the minimum accounting view');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.people where id = '10000000-0000-0000-0000-000000000001'), 1, 'secretary can read the test administrative person');

select * from finish();
rollback;
