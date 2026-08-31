begin;
select plan(7);

select ok(to_regprocedure('public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint)') is not null, 'document result function exists');
select ok(has_function_privilege('service_role', 'public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint)', 'EXECUTE'), 'service role can persist result');
select ok(not has_function_privilege('authenticated', 'public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint)', 'EXECUTE'), 'authenticated cannot persist system result');

insert into public.form_templates (id,name) values ('74000000-0000-0000-0000-000000000001','Document result synthetic');
insert into public.form_template_versions (id,template_id,version,data_classification,schema)
values ('74000000-0000-0000-0000-000000000002','74000000-0000-0000-0000-000000000001',1,'sensitive','{"fields":[]}'::jsonb);
insert into public.form_submissions (id,subject_id,template_version_id,status)
values ('74000000-0000-0000-0000-000000000003','74000000-0000-0000-0000-000000000004','74000000-0000-0000-0000-000000000002','submitted');
insert into public.form_submission_versions (id,submission_id,version,answers_ciphertext,answers_iv,answers_auth_tag,key_version,submitted_at)
values ('74000000-0000-0000-0000-000000000005','74000000-0000-0000-0000-000000000003',1,'cipher','iv','tag',1,clock_timestamp());
select * from public.sign_form_submission(
 '74000000-0000-0000-0000-000000000005','truth-v1','Pessoa Sintética','patient_capability',repeat('d',64),
 'signed-form:74000000-0000-0000-0000-000000000005');

set local role service_role;
select lives_ok($$select public.persist_document_job_result(
 (select id from public.document_jobs where idempotency_key='signed-form:74000000-0000-0000-0000-000000000005'),
 (select id from public.signature_evidence where submission_version_id='74000000-0000-0000-0000-000000000005'),
 'ready',null,'signed/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf',repeat('e',64),1234)$$,
 'ready result persists atomically');
reset role;

select is((select status from public.document_jobs where idempotency_key='signed-form:74000000-0000-0000-0000-000000000005'),'completed','job becomes completed');
select is((select document_status from public.signature_evidence where submission_version_id='74000000-0000-0000-0000-000000000005'),'ready','evidence becomes ready');
select is((select document_byte_length from public.signature_evidence where submission_version_id='74000000-0000-0000-0000-000000000005'),1234::bigint,'artifact metadata persists');
select * from finish();
rollback;
