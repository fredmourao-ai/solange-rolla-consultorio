begin;

select plan(18);

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
  ('fc000000-0000-4000-8000-000000000001','authenticated','authenticated','forms-atomic-owner@example.test','synthetic',now(),'{}','{}'),
  ('fc000000-0000-4000-8000-000000000002','authenticated','authenticated','forms-atomic-secretary@example.test','synthetic',now(),'{}','{}'),
  ('fc000000-0000-4000-8000-000000000003','authenticated','authenticated','forms-atomic-accounting@example.test','synthetic',now(),'{}','{}');

insert into public.profiles (user_id,role,display_name,active)
values
  ('fc000000-0000-4000-8000-000000000001','psychologist_owner','Forms Atomic Owner',true),
  ('fc000000-0000-4000-8000-000000000002','secretary','Forms Atomic Secretary',true),
  ('fc000000-0000-4000-8000-000000000003','accounting','Forms Atomic Accounting',true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fc000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select public.create_form_template_atomic(
    'fc100000-0000-4000-8000-000000000001',
    'fc110000-0000-4000-8000-000000000001',
    'Atomic Intake','administrative',
    '{"fields":[{"key":"name","label":"Nome","type":"short_text","required":true}]}'::jsonb
  ) $$,
  'owner creates template and version atomically'
);
select is(
  (select count(*)::int from public.form_templates where id='fc100000-0000-4000-8000-000000000001'),
  1,
  'template persists'
);
select is(
  (select count(*)::int from public.form_template_versions where id='fc110000-0000-4000-8000-000000000001'),
  1,
  'template version persists'
);
select is(
  (select count(*)::int from public.audit_events
   where action='form_template.created' and entity_id='fc100000-0000-4000-8000-000000000001'),
  1,
  'template create emits exactly one audit'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fc000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.create_form_template_atomic(
    'fc100000-0000-4000-8000-000000000002',
    'fc110000-0000-4000-8000-000000000002',
    'Secretary Forbidden','administrative',
    '{"fields":[{"key":"x","label":"X","type":"short_text","required":false}]}'::jsonb
  ) $$,
  '42501','FORM_TEMPLATE_CREATE_FORBIDDEN',
  'secretary cannot manage templates'
);

select lives_ok(
  $$ select public.issue_form_capability_atomic(
    'fc120000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001',
    'fc110000-0000-4000-8000-000000000001',
    'fc130000-0000-4000-8000-000000000001',
    repeat('a',64),
    now()+interval '1 day'
  ) $$,
  'secretary issues submission and capability atomically'
);
select is(
  (select count(*)::int from public.form_submissions where id='fc120000-0000-4000-8000-000000000001'),
  1,
  'submission persists'
);
select is(
  (select count(*)::int from public.capabilities
   where id='fc130000-0000-4000-8000-000000000001' and token_hash=repeat('a',64)),
  1,
  'only the capability hash persists'
);
select is(
  (select count(*)::int from public.audit_events
   where action='form.capability_issued' and entity_id='fc120000-0000-4000-8000-000000000001'),
  1,
  'capability issuance emits exactly one audit'
);
select ok(
  (select metadata::text not like '%'||repeat('a',64)||'%'
   from public.audit_events
   where action='form.capability_issued' and entity_id='fc120000-0000-4000-8000-000000000001'),
  'capability hash is absent from audit metadata'
);
select throws_ok(
  $$ insert into public.capabilities (
    token_hash,purpose,subject_type,subject_id,expires_at
  ) values (
    repeat('c',64),'form_fill','form_submission',
    'fc120000-0000-4000-8000-000000000001',now()+interval '1 day'
  ) $$,
  '42501',null,
  'staff still cannot write capabilities directly'
);

reset role;
create or replace function public.test_reject_form_atomic_audit()
returns trigger
language plpgsql
as $$
begin
  if new.action in ('form_template.created','form.capability_issued') then
    raise exception 'SYNTHETIC_FORM_AUDIT_FAILURE' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger test_reject_form_atomic_audit
before insert on public.audit_events
for each row execute function public.test_reject_form_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fc000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.create_form_template_atomic(
    'fc100000-0000-4000-8000-000000000003',
    'fc110000-0000-4000-8000-000000000003',
    'Rollback Template','sensitive',
    '{"fields":[{"key":"y","label":"Y","type":"short_text","required":true}]}'::jsonb
  ) $$,
  '55000','SYNTHETIC_FORM_AUDIT_FAILURE',
  'audit failure rolls back template and version'
);
select is(
  (select count(*)::int from public.form_templates where id='fc100000-0000-4000-8000-000000000003'),
  0,
  'failed template leaves no template'
);
select is(
  (select count(*)::int from public.form_template_versions where id='fc110000-0000-4000-8000-000000000003'),
  0,
  'failed template leaves no version'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fc000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.issue_form_capability_atomic(
    'fc120000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000001',
    'fc110000-0000-4000-8000-000000000001',
    'fc130000-0000-4000-8000-000000000002',
    repeat('b',64),
    now()+interval '1 day'
  ) $$,
  '55000','SYNTHETIC_FORM_AUDIT_FAILURE',
  'audit failure rolls back submission and capability'
);
select is(
  (select count(*)::int from public.form_submissions where id='fc120000-0000-4000-8000-000000000002'),
  0,
  'failed issuance leaves no submission'
);
select is(
  (select count(*)::int from public.capabilities where id='fc130000-0000-4000-8000-000000000002'),
  0,
  'failed issuance leaves no capability'
);

reset role;
drop trigger test_reject_form_atomic_audit on public.audit_events;
drop function public.test_reject_form_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"fc000000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.issue_form_capability_atomic(
    'fc120000-0000-4000-8000-000000000003',
    'd0000000-0000-4000-8000-000000000001',
    'fc110000-0000-4000-8000-000000000001',
    'fc130000-0000-4000-8000-000000000003',
    repeat('d',64),
    now()+interval '1 day'
  ) $$,
  '42501','FORM_CAPABILITY_ISSUE_FORBIDDEN',
  'accounting cannot issue form capabilities'
);

reset role;
select * from finish();
rollback;
