begin;

select plan(13);

select has_table('public', 'tasks', 'collaboration tasks table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'tasks has RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.tasks'::regclass), 'tasks forces RLS');

select is((select count(*)::integer from public.permission_definitions where permission_key in
  ('tasks.read', 'tasks.create', 'tasks.update', 'tasks.assign')), 4, 'all four task permissions exist');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('f6000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'tasks-owner@example.test', 'synthetic', now(), '{}', '{}'),
  ('f6000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'tasks-secretary@example.test', 'synthetic', now(), '{}', '{}'),
  ('f6000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'tasks-accounting@example.test', 'synthetic', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('f6000000-0000-4000-8000-000000000001', 'psychologist_owner', 'Owner'),
  ('f6000000-0000-4000-8000-000000000002', 'secretary', 'Secretary'),
  ('f6000000-0000-4000-8000-000000000003', 'accounting', 'Accounting');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f6000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);

insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
values ('schedule_follow_up', 'Agendar retorno em 15 dias', 'f6000000-0000-4000-8000-000000000002', 'f6000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.tasks), 1, 'secretary can create an administrative task without AAL2');

select throws_ok(
  $$ insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
     values ('other_admin', 'Tarefa em nome de outra pessoa', 'f6000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'secretary cannot create a task attributed to another user'
);

select set_config('request.jwt.claims', '{"sub":"f6000000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::integer from public.tasks), 0, 'accounting without tasks.read sees no tasks');
select throws_ok(
  $$ insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
     values ('other_admin', 'Tentativa de criação', 'f6000000-0000-4000-8000-000000000003', 'f6000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'accounting without tasks.create cannot insert a task'
);

select set_config('request.jwt.claims', '{"sub":"f6000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::integer from public.tasks), 1, 'owner can read the administrative task without AAL2');

update public.tasks set status = 'done' where assigned_to_user_id = 'f6000000-0000-4000-8000-000000000001';
select is((select status from public.tasks limit 1), 'done', 'owner with tasks.update can transition the task');

reset role;
select throws_ok(
  $$ insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
     values ('other_admin', repeat('x', 141), 'f6000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000001') $$,
  '23514',
  null,
  'title longer than 140 characters is rejected at the database level'
);
select throws_ok(
  $$ insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
     values ('unstructured_narrative', 'Tarefa com tipo não catalogado', 'f6000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000001') $$,
  '23514',
  null,
  'an unstructured task type is rejected at the database level'
);
select throws_ok(
  $$ insert into public.tasks (type, title, status, created_by_user_id, assigned_to_user_id)
     values ('other_admin', 'Status inválido', 'archived', 'f6000000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000001') $$,
  '23514',
  null,
  'an unrecognized status is rejected at the database level'
);

select * from finish();
rollback;
