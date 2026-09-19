begin;

select plan(22);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data
) values
  ('fd000000-0000-4000-8000-000000000001','authenticated','authenticated','fiscal-atomic-owner@example.test','synthetic',now(),'{}','{}'),
  ('fd000000-0000-4000-8000-000000000002','authenticated','authenticated','fiscal-atomic-accounting@example.test','synthetic',now(),'{}','{}');

insert into public.profiles (user_id,role,display_name,active)
values
  ('fd000000-0000-4000-8000-000000000001','psychologist_owner','Fiscal Atomic Owner',true),
  ('fd000000-0000-4000-8000-000000000002','accounting','Fiscal Atomic Accounting',true);

insert into public.people (id,civil_name,birth_date,cpf_normalized,fiscal_address)
values (
  'fd100000-0000-4000-8000-000000000001',
  'Pessoa Fiscal Atomic','1990-01-01','52998224725','{"city":"Teste"}'::jsonb
);

insert into public.fiscal_profiles (
  id,version,issuer_kind,issuer_document,municipality_code,service_code,tax_regime,
  fiscal_address,effective_from,active
) values (
  'fd200000-0000-4000-8000-000000000001',77,'individual','12345678901',
  '3122306','8650002','pf','{"city":"Teste"}'::jsonb,now()-interval '1 day',true
);

insert into public.fiscal_treatments (
  id,source_kind,version,issuance_rule,approved,effective_from
) values (
  'fd300000-0000-4000-8000-000000000001','appointment_completed',77,
  'service_completed',true,now()-interval '1 day'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.issue_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001',
    'appointment_completed',
    'fd500000-0000-4000-8000-000000000001',
    'fd100000-0000-4000-8000-000000000001',
    'fd100000-0000-4000-8000-000000000001',
    15000,
    'fd200000-0000-4000-8000-000000000001',77,
    'fd300000-0000-4000-8000-000000000001',77,
    'appointment_completed:fd500000-0000-4000-8000-000000000001:77:77',
    'mock-nfse-atomic-1','mock-protocol-atomic-1',now(),
    'fd400000-0000-4000-8000-000000000001/nfse.xml',
    'fd400000-0000-4000-8000-000000000001/nfse.pdf',
    repeat('a',64),123,repeat('b',64),456
  ) $$,
  'accounting may issue a mock document atomically'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'issued',
  'issued document persists'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='issue'),
  1,
  'issue creates exactly one attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_issued'),
  1,
  'issue creates exactly one audit event'
);

reset role;
create or replace function public.test_reject_fiscal_atomic_audit()
returns trigger
language plpgsql
as $$
begin
  if new.action in ('fiscal.mock_issued','fiscal.mock_cancelled') then
    raise exception 'SYNTHETIC_FISCAL_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger test_reject_fiscal_atomic_audit
before insert on public.audit_events
for each row execute function public.test_reject_fiscal_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.issue_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000002',
    'appointment_completed',
    'fd500000-0000-4000-8000-000000000002',
    'fd100000-0000-4000-8000-000000000001',
    'fd100000-0000-4000-8000-000000000001',
    16000,
    'fd200000-0000-4000-8000-000000000001',77,
    'fd300000-0000-4000-8000-000000000001',77,
    'appointment_completed:fd500000-0000-4000-8000-000000000002:77:77',
    'mock-nfse-atomic-2','mock-protocol-atomic-2',now(),
    'fd400000-0000-4000-8000-000000000002/nfse.xml',
    'fd400000-0000-4000-8000-000000000002/nfse.pdf',
    repeat('c',64),124,repeat('d',64),457
  ) $$,
  '55000','SYNTHETIC_FISCAL_AUDIT_FAILURE',
  'audit failure rolls back fiscal issue'
);
select is(
  (select count(*)::int from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000002'),
  0,
  'failed issue leaves no fiscal document'
);
select is(
  (select count(*)::int from public.fiscal_attempts where fiscal_document_id='fd400000-0000-4000-8000-000000000002'),
  0,
  'failed issue leaves no fiscal attempt'
);

select throws_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','accounting forbidden'
  ) $$,
  '42501','FISCAL_CANCEL_FORBIDDEN',
  'accounting cannot cancel fiscal documents'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','owner aal1 forbidden'
  ) $$,
  '42501','FISCAL_CANCEL_FORBIDDEN',
  'owner AAL1 cannot cancel fiscal documents'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','synthetic rollback'
  ) $$,
  '55000','SYNTHETIC_FISCAL_AUDIT_FAILURE',
  'audit failure rolls back fiscal cancellation'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'issued',
  'failed cancellation restores issued status'
);
select is(
  (select count(*)::int from public.fiscal_cancellation_events
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001'),
  0,
  'failed cancellation leaves no cancellation event'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='cancel'),
  0,
  'failed cancellation leaves no cancel attempt'
);

reset role;
drop trigger test_reject_fiscal_atomic_audit on public.audit_events;
drop function public.test_reject_fiscal_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','cancelamento de homologacao'
  ) $$,
  'owner AAL2 cancels atomically'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'cancelled',
  'successful cancellation persists cancelled status'
);
select is(
  (select count(*)::int from public.fiscal_cancellation_events
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and status='cancelled'),
  1,
  'successful cancellation creates one event'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='cancel'),
  1,
  'successful cancellation creates one attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_cancelled'),
  1,
  'successful cancellation creates one audit event'
);

select lives_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','cancelamento de homologacao'
  ) $$,
  'cancellation retry is idempotent'
);
select is(
  (select count(*)::int from public.fiscal_cancellation_events
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001'),
  1,
  'retry does not duplicate cancellation event'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='cancel'),
  1,
  'retry does not duplicate cancel attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_cancelled'),
  1,
  'retry does not duplicate cancellation audit'
);

reset role;
select * from finish();
rollback;
