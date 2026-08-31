begin;

select plan(10);

insert into public.form_templates (id, name) values
  ('71000000-0000-0000-0000-000000000001', 'Synthetic intake');
insert into public.form_template_versions (
  id, template_id, version, data_classification, schema
) values (
  '71000000-0000-0000-0000-000000000002',
  '71000000-0000-0000-0000-000000000001',
  1, 'sensitive', '{"fields":[]}'::jsonb
);
insert into public.form_submissions (
  id, subject_id, template_version_id
) values (
  '71000000-0000-0000-0000-000000000003',
  '71000000-0000-0000-0000-000000000004',
  '71000000-0000-0000-0000-000000000002'
);

select ok(
  to_regprocedure('public.persist_form_submission(uuid,uuid,text,jsonb,text,text,text,integer)') is not null,
  'persistence function exists'
);
select lives_ok($$
  select * from public.persist_form_submission(
    '71000000-0000-0000-0000-000000000003',
    '71000000-0000-0000-0000-000000000002',
    'draft', null, 'cipher', 'iv', 'tag', 1
  )
$$, 'sensitive draft is persisted');

select is(
  (select answers is null from public.form_submission_versions
   where submission_id = '71000000-0000-0000-0000-000000000003'),
  true,
  'sensitive draft has no plaintext answers'
);
select is(
  (select answers_ciphertext from public.form_submission_versions
   where submission_id = '71000000-0000-0000-0000-000000000003'),
  'cipher',
  'encrypted payload is stored'
);
select is(
  (select status from public.form_submissions
   where id = '71000000-0000-0000-0000-000000000003'),
  'draft',
  'draft keeps parent in draft state'
);
select lives_ok($$
  select * from public.persist_form_submission(
    '71000000-0000-0000-0000-000000000003',
    '71000000-0000-0000-0000-000000000002',
    'submitted', null, 'cipher-2', 'iv-2', 'tag-2', 1
  )
$$, 'draft can be submitted atomically');

select is(
  (select status from public.form_submissions
   where id = '71000000-0000-0000-0000-000000000003'),
  'submitted',
  'submit advances parent state'
);
select is(
  (select count(*)::integer from public.form_submission_versions
   where submission_id = '71000000-0000-0000-0000-000000000003'),
  1,
  'submit updates the bound version instead of duplicating it'
);
select is(
  (select answers_ciphertext from public.form_submission_versions
   where submission_id = '71000000-0000-0000-0000-000000000003'),
  'cipher-2',
  'submitted envelope replaces draft envelope'
);
select throws_ok($$
  select * from public.persist_form_submission(
    '71000000-0000-0000-0000-000000000003',
    '71000000-0000-0000-0000-000000000099',
    'draft', null, 'cipher', 'iv', 'tag', 1
  )
$$, 'P0001', 'FORM_TEMPLATE_VERSION_MISMATCH', 'template binding cannot change');

select * from finish();
rollback;
