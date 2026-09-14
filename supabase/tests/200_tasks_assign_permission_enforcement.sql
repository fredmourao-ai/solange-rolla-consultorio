begin;

select plan(3);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('f7000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'tasks-assign-owner@example.test', 'synthetic', now(), '{}', '{}'),
  ('f7000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'tasks-assign-secretary@example.test', 'synthetic', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('f7000000-0000-4000-8000-000000000001', 'psychologist_owner', 'Owner'),
  ('f7000000-0000-4000-8000-000000000002', 'secretary', 'Secretary');

-- Revoke tasks.assign specifically from the secretary while keeping tasks.create,
-- to prove the RLS check actually distinguishes the two permissions.
insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
values ('f7000000-0000-4000-8000-000000000002', 'tasks.assign', false, 'f7000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f7000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);

insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
values ('other_admin', 'Tarefa auto-atribuída', 'f7000000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000002');
select is(
  (select count(*)::integer from public.tasks where assigned_to_user_id = 'f7000000-0000-4000-8000-000000000002'),
  1,
  'a secretary without tasks.assign can still self-assign a task with only tasks.create'
);

select throws_ok(
  $$ insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
     values ('other_admin', 'Tarefa para outra pessoa', 'f7000000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'a secretary without tasks.assign cannot assign a task to someone else, even with tasks.create'
);

reset role;
delete from public.user_permission_overrides where user_id = 'f7000000-0000-4000-8000-000000000002' and permission_key = 'tasks.assign';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f7000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);

insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
values ('other_admin', 'Tarefa para outra pessoa agora permitida', 'f7000000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000001');
select is(
  (select count(*)::integer from public.tasks where assigned_to_user_id = 'f7000000-0000-4000-8000-000000000001' and created_by_user_id = 'f7000000-0000-4000-8000-000000000002'),
  1,
  'restoring tasks.assign allows the secretary to assign a task to someone else again'
);

select * from finish();
rollback;
