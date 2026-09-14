begin;

select plan(6);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('f9000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'tasks-pool-owner@example.test', 'synthetic', now(), '{}', '{}'),
  ('f9000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'tasks-pool-secretary-a@example.test', 'synthetic', now(), '{}', '{}'),
  ('f9000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'tasks-pool-secretary-b@example.test', 'synthetic', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('f9000000-0000-4000-8000-000000000001', 'psychologist_owner', 'Owner'),
  ('f9000000-0000-4000-8000-000000000002', 'secretary', 'Secretary A'),
  ('f9000000-0000-4000-8000-000000000003', 'secretary', 'Secretary B');

-- Secretary A creates an unassigned task for the shared pool.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f9000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);

insert into public.tasks (id, type, title, created_by_user_id, assigned_to_user_id)
values ('f9100000-0000-4000-8000-000000000001', 'other_admin', 'Tratar pendência administrativa', 'f9000000-0000-4000-8000-000000000002', null);
select is(
  (select assigned_to_user_id from public.tasks where id = 'f9100000-0000-4000-8000-000000000001'),
  null,
  'a task can be created with no assignee for the shared pool'
);

-- Secretary A claims it for herself: only needs tasks.update, since the new
-- assignee is the actor themselves.
update public.tasks set assigned_to_user_id = 'f9000000-0000-4000-8000-000000000002'
where id = 'f9100000-0000-4000-8000-000000000001';
select is(
  (select assigned_to_user_id from public.tasks where id = 'f9100000-0000-4000-8000-000000000001'),
  'f9000000-0000-4000-8000-000000000002',
  'a secretary with only tasks.update can claim an unassigned task for herself'
);

-- Revoke tasks.assign from Secretary A to prove the remaining checks are
-- actually gated by it, not merely by having tasks.update.
reset role;
insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
values ('f9000000-0000-4000-8000-000000000002', 'tasks.assign', false, 'f9000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f9000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);
select throws_ok(
  $$ update public.tasks set assigned_to_user_id = 'f9000000-0000-4000-8000-000000000003'
     where id = 'f9100000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'reassigning a task to someone else requires tasks.assign, even with tasks.update'
);

-- Releasing it back to the pool does not require tasks.assign.
update public.tasks set assigned_to_user_id = null
where id = 'f9100000-0000-4000-8000-000000000001';
select is(
  (select assigned_to_user_id from public.tasks where id = 'f9100000-0000-4000-8000-000000000001'),
  null,
  'releasing a task back to the unassigned pool does not require tasks.assign'
);

reset role;
delete from public.user_permission_overrides where user_id = 'f9000000-0000-4000-8000-000000000002' and permission_key = 'tasks.assign';

-- With tasks.assign restored, Secretary A can reassign to someone else.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f9000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);
update public.tasks set assigned_to_user_id = 'f9000000-0000-4000-8000-000000000003'
where id = 'f9100000-0000-4000-8000-000000000001';
select is(
  (select assigned_to_user_id from public.tasks where id = 'f9100000-0000-4000-8000-000000000001'),
  'f9000000-0000-4000-8000-000000000003',
  'restoring tasks.assign allows reassigning to someone else again'
);

reset role;
select is(
  (select relrowsecurity from pg_class where oid = 'public.tasks'::regclass)::boolean,
  true,
  'tasks RLS remains enabled after the unassigned-pool migration'
);

select * from finish();
rollback;
