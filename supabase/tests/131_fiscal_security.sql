begin;
select plan(9);
select ok(not has_table_privilege('anon', 'public.fiscal_documents', 'SELECT'), 'anonymous has no fiscal document select privilege');
select ok(has_table_privilege('authenticated', 'public.fiscal_documents', 'SELECT'), 'authenticated select is still filtered by RLS');
select ok((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'fiscal_documents_accounting') like '%psychologist_owner%', 'documents policy includes owner');
select ok((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'fiscal_documents_accounting') like '%accounting%', 'documents policy includes accounting');
select ok((select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'fiscal_documents_accounting') not like '%secretary%', 'documents policy excludes secretary');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'fiscal-owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'fiscal-secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'fiscal-accounting@example.test', 'synthetic-password', now(), '{}', '{}');
insert into public.profiles (user_id, role, display_name)
values
  ('30000000-0000-0000-0000-000000000001', 'psychologist_owner', 'Fiscal Owner'),
  ('30000000-0000-0000-0000-000000000002', 'secretary', 'Fiscal Secretary'),
  ('30000000-0000-0000-0000-000000000003', 'accounting', 'Fiscal Accounting');
insert into public.people (id, civil_name, birth_date, cpf_normalized, fiscal_address)
values ('30000000-0000-0000-0000-000000000010', 'Pessoa Fiscal Sintetica', '1990-01-01', '52998224725', '{"city":"Teste"}');
insert into public.fiscal_profiles (id, version, issuer_kind, issuer_document, municipality_code, service_code, tax_regime, effective_from)
values ('30000000-0000-0000-0000-000000000020', 99, 'individual', '12345678901', '3550308', '1.01', 'normal', now() - interval '1 day');
insert into public.fiscal_treatments (id, source_kind, version, issuance_rule, approved, effective_from)
values ('30000000-0000-0000-0000-000000000030', 'appointment_completed', 99, 'service_completed', true, now() - interval '1 day');
insert into public.fiscal_documents (id, source_type, source_id, person_id, payer_person_id, amount_cents, profile_id, profile_version, treatment_id, treatment_version, provider, idempotency_key, external_id, protocol, status, issued_at)
values ('30000000-0000-0000-0000-000000000040', 'appointment_completed', '30000000-0000-0000-0000-000000000050', '30000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000010', 15000, '30000000-0000-0000-0000-000000000020', 99, '30000000-0000-0000-0000-000000000030', 99, 'mock', 'fiscal-test:99:99', 'mock-nfse-test', 'mock-protocol-test', 'issued', now());

select throws_ok($$ update public.fiscal_documents set external_id = 'tampered' where id = '30000000-0000-0000-0000-000000000040' $$, 'P0001', 'ISSUED_FISCAL_DOCUMENT_IMMUTABLE', 'issued document external id is immutable');
set local role anon;
select throws_ok($$ select count(*) from public.fiscal_documents $$, '42501', null, 'anonymous cannot read fiscal documents');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.fiscal_documents), 0, 'secretary cannot read fiscal documents');
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from public.fiscal_documents), 1, 'accounting can read fiscal documents');
select * from finish();
rollback;
