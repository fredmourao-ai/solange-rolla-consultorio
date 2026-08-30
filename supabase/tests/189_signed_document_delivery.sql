select plan(11);

select has_column('public', 'document_jobs', 'kind', 'document job stores kind');
select has_column('public', 'document_jobs', 'dispatched_at', 'document job stores dispatch time');
select has_column('public', 'document_jobs', 'attempts', 'document job stores attempts');
select has_column('public', 'document_jobs', 'last_error_code', 'document job stores sanitized error code');
select has_column('public', 'document_jobs', 'completed_at', 'document job stores completion time');
select has_column('public', 'signature_evidence', 'document_storage_path', 'evidence stores private PDF path');
select has_column('public', 'signature_evidence', 'document_sha256', 'evidence stores PDF hash');
select has_column('public', 'signature_evidence', 'document_byte_length', 'evidence stores PDF byte length');
select ok(has_table_privilege('service_role', 'public.document_jobs', 'UPDATE'), 'service role can update document jobs');
select ok(has_table_privilege('service_role', 'public.signature_evidence', 'UPDATE'), 'service role can persist document artifact metadata');
select ok((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.document_jobs'::regclass and conname='document_jobs_status_check') like '%failed_retryable%' and (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.document_jobs'::regclass and conname='document_jobs_status_check') like '%failed_final%', 'document job status distinguishes retryable and final failures');

select * from finish();
