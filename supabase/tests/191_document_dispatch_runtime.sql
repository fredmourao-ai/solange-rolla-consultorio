begin;
select plan(8);

update public.document_jobs set status = 'completed', dispatched_at = coalesce(dispatched_at, clock_timestamp()), completed_at = coalesce(completed_at, clock_timestamp()) where status <> 'completed';
select ok(to_regprocedure('public.claim_document_jobs(integer)') is not null, 'claim function exists');
select ok(has_function_privilege('service_role', 'public.claim_document_jobs(integer)', 'EXECUTE'), 'service role can claim jobs');
select ok(not has_function_privilege('authenticated', 'public.claim_document_jobs(integer)', 'EXECUTE'), 'authenticated cannot claim jobs');
select ok(not has_function_privilege('anon', 'public.claim_document_jobs(integer)', 'EXECUTE'), 'anonymous cannot claim jobs');

insert into public.form_templates (id, name) values ('73000000-0000-0000-0000-000000000001', 'Dispatch synthetic');
insert into public.form_template_versions (id, template_id, version, data_classification, schema)
values ('73000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000001',1,'sensitive','{"fields":[]}'::jsonb);
insert into public.form_submissions (id, subject_id, template_version_id, status)
values ('73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000002','submitted');
insert into public.form_submission_versions (id, submission_id, version, answers_ciphertext, answers_iv, answers_auth_tag, key_version, submitted_at)
values ('73000000-0000-0000-0000-000000000005','73000000-0000-0000-0000-000000000003',1,'cipher','iv','tag',1,clock_timestamp());
select * from public.sign_form_submission(
  '73000000-0000-0000-0000-000000000005','declaration-v1','Paciente Sintético','patient_capability',
  repeat('c',64),'signed-form:73000000-0000-0000-0000-000000000005'
);

set local role service_role;
select is((select count(*)::integer from public.claim_document_jobs(10)), 1, 'service role claims pending document job');
reset role;
select is((select status from public.document_jobs where idempotency_key='signed-form:73000000-0000-0000-0000-000000000005'), 'processing', 'claim marks job processing');
select is((select attempts from public.document_jobs where idempotency_key='signed-form:73000000-0000-0000-0000-000000000005'), 1, 'claim increments attempts');
set local role service_role;
select is((select count(*)::integer from public.claim_document_jobs(10)), 1, 'undispatched processing job can be reclaimed after dispatcher crash');
reset role;
select * from finish();
rollback;
