begin;

select plan(28);

select has_table('clinical', 'medical_histories', 'medical histories exist');
select ok((select relrowsecurity from pg_class where oid = 'clinical.medical_histories'::regclass), 'medical histories enable RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'clinical.medical_histories'::regclass), 'medical histories force RLS');
select ok(not has_table_privilege('anon', 'clinical.medical_histories', 'SELECT'), 'anonymous has no medical history select privilege');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('42000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'history-owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'history-secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('42000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'history-accounting@example.test', 'synthetic-password', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('42000000-0000-0000-0000-000000000001', 'psychologist_owner', 'History Owner'),
  ('42000000-0000-0000-0000-000000000002', 'secretary', 'History Secretary'),
  ('42000000-0000-0000-0000-000000000003', 'accounting', 'History Accounting');

insert into public.people (id, civil_name, birth_date)
values
  ('42000000-0000-0000-0000-000000000010', 'Paciente Sintético Histórico', '1990-01-01'),
  ('42000000-0000-0000-0000-000000000011', 'Paciente Sintético Raiz', '1991-01-01'),
  ('42000000-0000-0000-0000-000000000012', 'Paciente Sintético Rollback', '1992-01-01');

insert into clinical.medical_histories (
  id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version, revision
) values (
  '42000000-0000-0000-0000-000000000020',
  '42000000-0000-0000-0000-000000000010',
  '42000000-0000-0000-0000-000000000001',
  'cipher-root', 'iv-root', 'tag-root', 1, 1
);

set local role anon;
select throws_ok($$ select count(*) from clinical.medical_histories $$, '42501', null, 'anonymous cannot read medical histories');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from clinical.medical_histories), 0, 'secretary cannot read medical histories');
select throws_ok($$
  select * from public.create_medical_history(
    '42000000-0000-0000-0000-000000000021',
    '42000000-0000-0000-0000-000000000010',
    '42000000-0000-0000-0000-000000000002',
    'cipher', 'iv', 'tag', 1, 'clinician_review', null,
    '42000000-0000-0000-0000-000000000020'
  )
$$, '42501', null, 'secretary cannot create medical history');

select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from clinical.medical_histories), 0, 'accounting cannot read medical histories');
select throws_ok($$
  select * from public.create_medical_history(
    '42000000-0000-0000-0000-000000000022',
    '42000000-0000-0000-0000-000000000010',
    '42000000-0000-0000-0000-000000000003',
    'cipher', 'iv', 'tag', 1, 'clinician_review', null,
    '42000000-0000-0000-0000-000000000020'
  )
$$, '42501', null, 'accounting cannot create medical history');

select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is((select count(*)::int from clinical.medical_histories), 0, 'owner at AAL1 cannot read medical histories');
select throws_ok($$
  select * from public.create_medical_history(
    '42000000-0000-0000-0000-000000000023',
    '42000000-0000-0000-0000-000000000010',
    '42000000-0000-0000-0000-000000000001',
    'cipher', 'iv', 'tag', 1, 'clinician_review', null,
    '42000000-0000-0000-0000-000000000020'
  )
$$, '42501', null, 'owner at AAL1 cannot create medical history');

select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}', true);
select is((select count(*)::int from clinical.medical_histories), 1, 'owner at AAL2 can read medical histories');
select is((select count(*)::int from public.list_medical_history_metadata('42000000-0000-0000-0000-000000000010')), 1, 'owner can list medical history metadata');
select is((select count(*)::int from public.get_medical_history_envelope('42000000-0000-0000-0000-000000000020')), 1, 'owner can read medical history envelope');

select is((
  select revision from public.create_medical_history(
    '42000000-0000-0000-0000-000000000024',
    '42000000-0000-0000-0000-000000000010',
    '42000000-0000-0000-0000-000000000001',
    'cipher-v2', 'iv-v2', 'tag-v2', 1, 'clinician_review', null,
    '42000000-0000-0000-0000-000000000020'
  )
), 2, 'superseding creates revision two');

select is((select count(*)::int from clinical.medical_histories), 2, 'superseding preserves original history');
select throws_ok($$
  select * from public.create_medical_history(
    '42000000-0000-0000-0000-000000000025',
    '42000000-0000-0000-0000-000000000010',
    '42000000-0000-0000-0000-000000000001',
    'fork', 'iv', 'tag', 1, 'clinician_review', null,
    '42000000-0000-0000-0000-000000000020'
  )
$$, '23505', null, 'history revision cannot fork');

select is((
  select count(*)::int from public.audit_events
  where entity_type = 'medical_history'
    and entity_id = '42000000-0000-0000-0000-000000000024'
), 1, 'successful supersede writes exactly one audit event');

select is((
  select action from public.audit_events
  where entity_type = 'medical_history'
    and entity_id = '42000000-0000-0000-0000-000000000024'
), 'medical_history.superseded', 'supersede audit action is explicit');

select is((
  select position('cipher-v2' in metadata::text) from public.audit_events
  where entity_type = 'medical_history'
    and entity_id = '42000000-0000-0000-0000-000000000024'
), 0, 'medical history audit metadata excludes clinical ciphertext');

select is((
  select revision from public.create_medical_history(
    '42000000-0000-0000-0000-000000000026',
    '42000000-0000-0000-0000-000000000011',
    '42000000-0000-0000-0000-000000000001',
    'cipher-root-2', 'iv-root-2', 'tag-root-2', 1, 'clinician_review', null, null
  )
), 1, 'root creation returns revision one');

select is((
  select count(*)::int from public.audit_events
  where entity_type = 'medical_history'
    and entity_id = '42000000-0000-0000-0000-000000000026'
    and action = 'medical_history.created'
), 1, 'successful root creation writes exactly one audit event');

reset role;

create or replace function pg_temp.reject_medical_history_audit()
returns trigger
language plpgsql
as $$
begin
  if new.entity_type = 'medical_history'
    and new.entity_id = '42000000-0000-0000-0000-000000000027'::uuid then
    raise exception 'MEDICAL_HISTORY_AUDIT_REJECTED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reject_medical_history_audit
before insert on public.audit_events
for each row execute function pg_temp.reject_medical_history_audit();

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"42000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}', true);

select throws_ok($$
  select * from public.create_medical_history(
    '42000000-0000-0000-0000-000000000027',
    '42000000-0000-0000-0000-000000000012',
    '42000000-0000-0000-0000-000000000001',
    'cipher-must-rollback', 'iv-rollback', 'tag-rollback', 1, 'clinician_review', null, null
  )
$$, 'P0001', 'MEDICAL_HISTORY_AUDIT_REJECTED', 'audit failure aborts medical history creation');

select is((
  select count(*)::int from clinical.medical_histories
  where id = '42000000-0000-0000-0000-000000000027'
), 0, 'audit failure rolls back medical history row');

select is((
  select count(*)::int from public.audit_events
  where entity_type = 'medical_history'
    and entity_id = '42000000-0000-0000-0000-000000000027'
), 0, 'audit failure leaves no partial audit event');

reset role;
drop trigger reject_medical_history_audit on public.audit_events;


select throws_ok(
  $$ update clinical.medical_histories set revision = 99 where id = '42000000-0000-0000-0000-000000000024' $$,
  '55000', null, 'medical history is immutable'
);
select throws_ok(
  $$ delete from clinical.medical_histories where id = '42000000-0000-0000-0000-000000000024' $$,
  '55000', null, 'medical history cannot be deleted'
);

select is((
  select count(*)::int
  from clinical.medical_histories
  where person_id = '42000000-0000-0000-0000-000000000010'
    and supersedes_id is not null
), 1, 'exactly one successor exists for the root revision');

select * from finish();
rollback;
