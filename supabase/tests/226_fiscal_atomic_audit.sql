begin;

select plan(55);

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data
) values
  ('fd000000-0000-4000-8000-000000000001','authenticated','authenticated','fiscal-lease-owner@example.test','synthetic',now(),'{}','{}'),
  ('fd000000-0000-4000-8000-000000000002','authenticated','authenticated','fiscal-lease-secretary@example.test','synthetic',now(),'{}','{}'),
  ('fd000000-0000-4000-8000-000000000003','authenticated','authenticated','fiscal-lease-accounting@example.test','synthetic',now(),'{}','{}');

insert into public.profiles (user_id,role,display_name,active)
values
  ('fd000000-0000-4000-8000-000000000001','psychologist_owner','Fiscal Lease Owner',true),
  ('fd000000-0000-4000-8000-000000000002','secretary','Fiscal Lease Secretary',true),
  ('fd000000-0000-4000-8000-000000000003','accounting','Fiscal Lease Accounting',true);

insert into public.people (id,civil_name,birth_date,cpf_normalized,fiscal_address)
values (
  'fd100000-0000-4000-8000-000000000001',
  'Pessoa Fiscal Lease','1990-01-01','52998224725','{"city":"Teste"}'::jsonb
);

insert into public.fiscal_profiles (
  id,version,issuer_kind,issuer_document,municipality_code,service_code,tax_regime,
  fiscal_address,effective_from,effective_until,active
) values (
  'fd200000-0000-4000-8000-000000000001',77,'individual','12345678901',
  '3122306','8650002','pf','{"city":"Teste"}'::jsonb,
  now()-interval '1 day',null,true
);

insert into public.fiscal_treatments (
  id,source_kind,version,issuance_rule,service_code,enabled_for_live,approved,effective_from,effective_until
) values (
  'fd300000-0000-4000-8000-000000000001','appointment_completed',77,
  'manual_review','8650002',false,true,now()-interval '1 day',null
);

create or replace function public.test_begin_fiscal(
  p_document_id uuid,
  p_source_id uuid,
  p_attempt_id uuid,
  p_review_ack boolean default true
)
returns jsonb
language sql
as $$
  select public.begin_mock_fiscal_document_issue_atomic(
    p_document_id,
    p_attempt_id,
    p_review_ack,
    'appointment_completed',
    p_source_id,
    'fd100000-0000-4000-8000-000000000001',
    'fd100000-0000-4000-8000-000000000001',
    15000,
    'fd200000-0000-4000-8000-000000000001',77,
    'fd300000-0000-4000-8000-000000000001',77,
    format('appointment_completed:%s:77:77',p_source_id),
    'mock-nfse-' || substr(replace(p_document_id::text,'-',''),1,20),
    'mock-protocol-' || substr(replace(p_document_id::text,'-',''),1,20),
    p_document_id::text || '/' || p_attempt_id::text || '/nfse.xml',
    p_document_id::text || '/' || p_attempt_id::text || '/nfse.pdf',
    repeat('a',64),123,repeat('b',64),456
  )
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000001',
    true
  ) $$,
  '42501','FISCAL_ISSUE_FORBIDDEN',
  'accounting without fiscal.issue cannot start issuance'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000001',
    false
  ) $$,
  '22023','FISCAL_TREATMENT_INVALID',
  'manual review cannot be bypassed through direct RPC'
);

select lives_ok(
  $$ select public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000001',
    true
  ) $$,
  'secretary with fiscal.issue starts reviewed issuance'
);
select is(
  (public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000001',
    true
  )->>'state'),
  'process',
  'same lease may safely re-enter processing'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'processing',
  'new document is durably processing before storage effects'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='issue'),
  1,
  're-entry does not duplicate issue attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_issue_started'),
  1,
  're-entry does not duplicate start audit'
);

select throws_ok(
  $$ select public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000002',
    true
  ) $$,
  '55P03','FISCAL_ISSUE_IN_PROGRESS',
  'concurrent fresh lease is rejected'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='issue'),
  1,
  'concurrent rejection does not create attempt'
);

select throws_ok(
  $$ select public.fail_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000099',
    'WRONG_LEASE'
  ) $$,
  '55P03','FISCAL_ISSUE_LEASE_LOST',
  'stale lease cannot mark active issuance failed'
);
select lives_ok(
  $$ select public.fail_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000001',
    'SYNTHETIC_STORAGE_FAILURE'
  ) $$,
  'active lease may record retryable failure'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'failed_retryable',
  'failure moves document to retryable state'
);
select is(
  (select status from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and attempt_number=1),
  'retryable_failure',
  'failure closes active attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_issue_failed'),
  1,
  'failure is audited once'
);

select is(
  (public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000002',
    true
  )->>'previousAttemptId'),
  'fd600000-0000-4000-8000-000000000001',
  'retry returns previous failed lease for cleanup'
);
select is(
  (select xml_path from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'fd400000-0000-4000-8000-000000000001/fd600000-0000-4000-8000-000000000002/nfse.xml',
  'retry moves storage path to new lease'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='issue'),
  2,
  'retry creates exactly one new issue attempt'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id,name) values
    ('fiscal-documents-private','fd400000-0000-4000-8000-000000000001/fd600000-0000-4000-8000-000000000002/nfse.xml'),
    ('fiscal-documents-private','fd400000-0000-4000-8000-000000000001/fd600000-0000-4000-8000-000000000002/nfse.pdf') $$,
  'active lease may persist only its expected storage objects'
);

select throws_ok(
  $$ select public.complete_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000001',
    now()
  ) $$,
  '55P03','FISCAL_ISSUE_LEASE_LOST',
  'stale lease cannot finalize newer retry'
);

reset role;
create or replace function public.test_reject_fiscal_issue_audit()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'fiscal.mock_issued' then
    raise exception 'SYNTHETIC_FISCAL_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger test_reject_fiscal_issue_audit
before insert on public.audit_events
for each row execute function public.test_reject_fiscal_issue_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.complete_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000002',
    now()
  ) $$,
  '55000','SYNTHETIC_FISCAL_AUDIT_FAILURE',
  'audit failure rolls back SQL finalization'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'processing',
  'failed finalize leaves document processing'
);
select is(
  (select status from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and attempt_number=2),
  'started',
  'failed finalize leaves lease active for compensation'
);

reset role;
drop trigger test_reject_fiscal_issue_audit on public.audit_events;
drop function public.test_reject_fiscal_issue_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.complete_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000002',
    now()
  ) $$,
  'active lease finalizes after artifacts exist'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'issued',
  'successful finalize persists issued state'
);
select is(
  (select status from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and attempt_number=2),
  'succeeded',
  'successful finalize closes current attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_issued'),
  1,
  'successful finalize writes issued audit once'
);
select is(
  (public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000001',
    'fd500000-0000-4000-8000-000000000001',
    'fd600000-0000-4000-8000-000000000003',
    true
  )->>'state'),
  'issued',
  'retry after success returns terminal issued state'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='issue'),
  2,
  'retry after success does not add attempts'
);

select lives_ok(
  $$ select public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000002',
    'fd500000-0000-4000-8000-000000000002',
    'fd600000-0000-4000-8000-000000000010',
    true
  ) $$,
  'second document starts for lease-expiry recovery test'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id,name) values
    ('fiscal-documents-private','fd400000-0000-4000-8000-000000000002/fd600000-0000-4000-8000-000000000010/nfse.xml'),
    ('fiscal-documents-private','fd400000-0000-4000-8000-000000000002/fd600000-0000-4000-8000-000000000010/nfse.pdf') $$,
  'initial lease stores synthetic artifacts before simulated crash'
);

reset role;
update public.fiscal_attempts
set started_at = now() - interval '6 minutes'
where fiscal_document_id='fd400000-0000-4000-8000-000000000002'
  and operation='issue'
  and correlation_id='fd600000-0000-4000-8000-000000000010';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  (public.test_begin_fiscal(
    'fd400000-0000-4000-8000-000000000002',
    'fd500000-0000-4000-8000-000000000002',
    'fd600000-0000-4000-8000-000000000011',
    true
  )->>'previousAttemptId'),
  'fd600000-0000-4000-8000-000000000010',
  'expired lease is reclaimed and exposed for cleanup'
);
select is(
  (select status from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000002'
     and correlation_id='fd600000-0000-4000-8000-000000000010'),
  'retryable_failure',
  'expired attempt is closed as retryable failure'
);
select is(
  (select error_code from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000002'
     and correlation_id='fd600000-0000-4000-8000-000000000010'),
  'PROCESSING_LEASE_EXPIRED',
  'expired attempt records deterministic error code'
);
select is(
  (select status from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000002'
     and correlation_id='fd600000-0000-4000-8000-000000000011'),
  'started',
  'takeover owns a new active attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000002'
     and action='fiscal.mock_issue_lease_expired'),
  1,
  'lease expiry is auditable'
);
select lives_ok(
  $$ delete from storage.objects
     where bucket_id='fiscal-documents-private'
       and name like 'fd400000-0000-4000-8000-000000000002/fd600000-0000-4000-8000-000000000010/%' $$,
  'new claimant may clean artifacts from expired lease'
);
select is(
  (select count(*)::int from storage.objects
   where bucket_id='fiscal-documents-private'
     and name like 'fd400000-0000-4000-8000-000000000002/fd600000-0000-4000-8000-000000000010/%'),
  0,
  'expired lease artifacts are removable without touching active lease'
);
select throws_ok(
  $$ select public.complete_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000002',
    'fd600000-0000-4000-8000-000000000010',
    now()
  ) $$,
  '55P03','FISCAL_ISSUE_LEASE_LOST',
  'expired lease cannot finalize after takeover'
);
select lives_ok(
  $$ select public.fail_mock_fiscal_document_issue_atomic(
    'fd400000-0000-4000-8000-000000000002',
    'fd600000-0000-4000-8000-000000000011',
    'SYNTHETIC_END'
  ) $$,
  'current takeover lease remains recoverable'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000002'),
  'failed_retryable',
  'takeover can close itself retryably'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','accounting forbidden'
  ) $$,
  '42501','FISCAL_CANCEL_FORBIDDEN',
  'accounting without fiscal.cancel cannot cancel'
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
  'owner AAL1 cannot use AAL2 cancellation permission'
);

reset role;
create or replace function public.test_reject_fiscal_cancel_audit()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'fiscal.mock_cancelled' then
    raise exception 'SYNTHETIC_FISCAL_CANCEL_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger test_reject_fiscal_cancel_audit
before insert on public.audit_events
for each row execute function public.test_reject_fiscal_cancel_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fd000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select public.cancel_mock_fiscal_document_atomic(
    'fd400000-0000-4000-8000-000000000001','synthetic rollback'
  ) $$,
  '55000','SYNTHETIC_FISCAL_CANCEL_AUDIT_FAILURE',
  'cancel audit failure rolls back cancellation'
);
select is(
  (select status from public.fiscal_documents where id='fd400000-0000-4000-8000-000000000001'),
  'issued',
  'failed cancellation restores issued state'
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
drop trigger test_reject_fiscal_cancel_audit on public.audit_events;
drop function public.test_reject_fiscal_cancel_audit();

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
  'owner AAL2 cancels mock fiscal document atomically'
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
  'cancel retry does not duplicate event'
);
select is(
  (select count(*)::int from public.fiscal_attempts
   where fiscal_document_id='fd400000-0000-4000-8000-000000000001' and operation='cancel'),
  1,
  'cancel retry does not duplicate attempt'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_id='fd400000-0000-4000-8000-000000000001' and action='fiscal.mock_cancelled'),
  1,
  'cancel retry does not duplicate audit'
);

reset role;
select * from finish();
rollback;
