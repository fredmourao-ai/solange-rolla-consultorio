begin;

select plan(9);

select has_table('public', 'services', 'services table exists');
select has_table('public', 'cancellation_policies', 'cancellation policies table exists');
select has_table('public', 'appointments', 'appointments table exists');
select has_table('public', 'appointment_status_history', 'appointment status history table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.appointments'::regclass), 'appointments has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.appointment_status_history'::regclass), 'status history has RLS enabled');

insert into public.legal_document_versions (document_id, version, content, content_hash_sha256, effective_from, is_draft)
select id, 99, 'Synthetic cancellation policy test version', repeat('b', 64), now(), false
from public.legal_documents where key = 'cancellation_policy';
insert into public.cancellation_policies (policy_version, countable_hours, excluded_weekdays, business_timezone, late_cancellation_charge_enabled, no_show_charge_enabled, effective_from, legal_document_version_id)
values (99, 48, '[0,6]', 'America/Sao_Paulo', true, true, now(), (select id from public.legal_document_versions where document_id = (select id from public.legal_documents where key = 'cancellation_policy') and version = 99));
insert into public.services (name, duration_minutes, price_cents)
values ('Consulta sintética', 50, 10000);

set local role anon;
select throws_ok($$ select count(*) from public.appointments $$, '42501', null, 'anonymous cannot read appointments');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.services), 0, 'accounting cannot read services');
select throws_ok($$ insert into public.appointments (person_id, service_id, starts_at, ends_at, policy_version, cancellation_deadline_at, business_timezone, cancellation_policy_snapshot) values ('10000000-0000-0000-0000-000000000001', (select id from public.services limit 1), now(), now() + interval '1 hour', 99, now(), 'America/Sao_Paulo', '{}') $$, '42501', null, 'accounting cannot create appointments');

select * from finish();
rollback;
