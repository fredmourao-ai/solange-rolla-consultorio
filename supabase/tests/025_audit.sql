begin;

select plan(10);

select has_table('public', 'audit_events', 'audit events table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit events has RLS enabled');
select has_index('public', 'audit_events_entity_idx', 'audit entity index exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'audit-owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'audit-secretary@example.test', 'synthetic-password', now(), '{}', '{}');
insert into public.profiles (user_id, role, display_name)
values
  ('00000000-0000-0000-0000-000000000011', 'psychologist_owner', 'Audit Owner'),
  ('00000000-0000-0000-0000-000000000012', 'secretary', 'Audit Secretary');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000012","aal":"aal1","role":"authenticated"}', true);
insert into public.audit_events (actor_user_id, action, entity_type, entity_id, correlation_id, metadata)
values ('00000000-0000-0000-0000-000000000012', 'person.created', 'person', '10000000-0000-0000-0000-000000000011', 'audit-test-1', '{"source":"test"}');
select throws_ok($$ insert into public.audit_events (actor_user_id, action, entity_type, entity_id, correlation_id) values ('00000000-0000-0000-0000-000000000011', 'forged', 'person', '10000000-0000-0000-0000-000000000011', 'audit-test-2') $$, '42501', null, 'actor cannot forge another user audit event');
select throws_ok($$ update public.audit_events set action = 'changed' $$, '42501', null, 'audit events cannot be updated');
select throws_ok($$ delete from public.audit_events $$, '42501', null, 'audit events cannot be deleted');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000011","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_events), 1, 'owner can read audit events with AAL2');

select * from finish();
rollback;
