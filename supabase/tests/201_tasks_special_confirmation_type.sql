begin;

select plan(2);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values ('f8000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'tasks-special-owner@example.test', 'synthetic', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values ('f8000000-0000-4000-8000-000000000001', 'psychologist_owner', 'Owner');

insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
values ('special_confirmation', 'Confirmação especial necessária', 'f8000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000001');
select is(
  (select count(*)::integer from public.tasks where type = 'special_confirmation'),
  1,
  'special_confirmation is an accepted task type'
);

select throws_ok(
  $$ insert into public.tasks (type, title, created_by_user_id, assigned_to_user_id)
     values ('still_not_a_real_type', 'Tarefa inválida', 'f8000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000001') $$,
  '23514',
  null,
  'an unrecognized task type remains rejected at the database level'
);

select * from finish();
rollback;
