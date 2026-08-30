begin;

select plan(10);

select ok(has_table_privilege('service_role', 'public.capabilities', 'SELECT'), 'service role can read capability sessions');
select ok(has_table_privilege('service_role', 'public.capabilities', 'UPDATE'), 'service role can revoke capabilities');
select ok(has_table_privilege('service_role', 'public.form_submissions', 'SELECT'), 'service role can read bound submissions');
select ok(has_table_privilege('service_role', 'public.form_template_versions', 'SELECT'), 'service role can read bound templates');
select ok(has_table_privilege('service_role', 'public.form_submission_versions', 'SELECT'), 'service role can read encrypted submission versions');
select ok(has_table_privilege('service_role', 'public.legal_documents', 'SELECT'), 'service role can read legal documents');
select ok(has_table_privilege('service_role', 'public.legal_document_versions', 'SELECT'), 'service role can read active legal versions');
select ok(has_table_privilege('service_role', 'public.legal_acceptances', 'INSERT'), 'service role can record legal acceptance');
select ok(has_table_privilege('service_role', 'public.document_jobs', 'SELECT'), 'service role can resolve idempotent document jobs');
select ok(has_table_privilege('service_role', 'public.signature_evidence', 'SELECT'), 'service role can resolve signature evidence');

select * from finish();
rollback;
