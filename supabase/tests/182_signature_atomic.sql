begin;

select plan(9);

insert into public.form_templates (id, name) values
  ('72000000-0000-0000-0000-000000000001', 'Synthetic signature');
insert into public.form_template_versions (
  id, template_id, version, data_classification, schema
) values (
  '72000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000001',
  1, 'sensitive', '{"fields":[]}'::jsonb
);
insert into public.form_submissions (
  id, subject_id, template_version_id, status
) values (
  '72000000-0000-0000-0000-000000000003',
  '72000000-0000-0000-0000-000000000004',
  '72000000-0000-0000-0000-000000000002',
  'submitted'
);
insert into public.form_submission_versions (
  id, submission_id, version, answers_ciphertext, answers_iv,
  answers_auth_tag, key_version, submitted_at
) values (
  '72000000-0000-0000-0000-000000000005',
  '72000000-0000-0000-0000-000000000003', 1,
  'cipher', 'iv', 'tag', 1, clock_timestamp()
);
select ok(
  to_regprocedure('public.sign_form_submission(uuid,text,text,text,text,text)') is not null,
  'atomic signature function exists'
);

select lives_ok($$
  select * from public.sign_form_submission(
    '72000000-0000-0000-0000-000000000005',
    'declaration-v1', 'Paciente Sintético', 'patient_capability',
    repeat('a', 64), 'signed-form:72000000-0000-0000-0000-000000000005'
  )
$$, 'submitted form can be signed');

select is(
  (select count(*)::integer from public.signature_evidence
   where submission_version_id = '72000000-0000-0000-0000-000000000005'),
  1, 'one evidence row is created'
);
select is(
  (select count(*)::integer from public.document_jobs
   where idempotency_key = 'signed-form:72000000-0000-0000-0000-000000000005'),
  1, 'one document job is created'
);
select is(
  (select status from public.form_submissions
   where id = '72000000-0000-0000-0000-000000000003'),
  'signed', 'parent submission becomes signed'
);
select lives_ok($$
  select * from public.sign_form_submission(
    '72000000-0000-0000-0000-000000000005',
    'declaration-v1', 'Paciente Sintético', 'patient_capability',
    repeat('a', 64), 'signed-form:72000000-0000-0000-0000-000000000005'
  )
$$, 'idempotent retry returns existing signature');

select is(
  (select count(*)::integer from public.signature_evidence
   where submission_version_id = '72000000-0000-0000-0000-000000000005'),
  1, 'retry does not duplicate evidence'
);
select is(
  (select count(*)::integer from public.document_jobs
   where idempotency_key = 'signed-form:72000000-0000-0000-0000-000000000005'),
  1, 'retry does not duplicate document job'
);
select throws_ok($$
  select * from public.sign_form_submission(
    '72000000-0000-0000-0000-000000000005',
    'declaration-v1', 'Paciente Sintético', 'patient_capability',
    repeat('b', 64), 'signed-form:72000000-0000-0000-0000-000000000005'
  )
$$, 'P0001', 'IDEMPOTENCY_KEY_CONFLICT', 'same key cannot sign different content');

select * from finish();
rollback;
