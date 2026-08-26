begin;

select plan(6);

select has_table('public', 'signature_evidence', 'signature evidence table exists');
select has_table('public', 'document_jobs', 'document jobs table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.signature_evidence'::regclass), 'signature evidence has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.document_jobs'::regclass), 'document jobs have RLS enabled');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.document_jobs'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%idempotency_key%'), 'document jobs enforce idempotency');
select ok((select count(*) = 1 from pg_trigger where tgrelid = 'public.form_submission_versions'::regclass and tgname = 'form_submission_versions_immutable_when_signed'), 'signed submission versions have immutability trigger');

select * from finish();
rollback;
