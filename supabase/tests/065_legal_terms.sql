begin;

select plan(6);

select has_table('public', 'legal_documents', 'legal documents table exists');
select has_table('public', 'legal_document_versions', 'legal document versions table exists');
select has_table('public', 'legal_acceptances', 'legal acceptances table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.legal_document_versions'::regclass), 'legal versions have RLS enabled');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.legal_acceptances'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%person_id%document_version_id%'), 'legal acceptances are unique per person and version');
select ok((select count(*) = 1 from pg_trigger where tgrelid = 'public.legal_document_versions'::regclass and tgname = 'legal_document_versions_immutable_after_acceptance'), 'accepted legal versions have immutability trigger');

select * from finish();
rollback;
