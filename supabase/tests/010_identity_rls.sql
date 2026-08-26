begin;

select plan(15);

select has_table('public', 'profiles', 'profiles table exists');
select has_column('public', 'profiles', 'role', 'profiles exposes role');
select has_type('public', 'app_role', 'application role enum exists');
select has_function('public', 'current_app_role', 'current_app_role helper exists');
select has_function('public', 'current_aal', 'current_aal helper exists');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles forces RLS');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'accounting@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'managed@example.test', 'synthetic-password', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('00000000-0000-0000-0000-000000000001', 'psychologist_owner', 'Teste Owner'),
  ('00000000-0000-0000-0000-000000000002', 'secretary', 'Teste Secretary'),
  ('00000000-0000-0000-0000-000000000003', 'accounting', 'Teste Accounting');

set local role anon;
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anonymous cannot read profiles');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'secretary reads only own profile');
select is((select role::text from public.profiles limit 1), 'secretary', 'secretary sees own role');
select throws_ok(
  $$ insert into public.profiles (user_id, role, display_name)
     values ('00000000-0000-0000-0000-000000000004', 'secretary', 'Teste Blocked') $$,
  '42501',
  null,
  'secretary cannot create profiles'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'owner at AAL1 cannot enumerate profiles');
select throws_ok(
  $$ insert into public.profiles (user_id, role, display_name)
     values ('00000000-0000-0000-0000-000000000004', 'secretary', 'Teste Blocked') $$,
  '42501',
  null,
  'owner at AAL1 cannot create profiles'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 3, 'owner at AAL2 can enumerate profiles');
select lives_ok(
  $$ insert into public.profiles (user_id, role, display_name)
     values ('00000000-0000-0000-0000-000000000004', 'secretary', 'Teste Managed') $$,
  'owner at AAL2 can create profiles'
);

select * from finish();
rollback;
