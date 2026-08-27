select plan(8);

select has_table('clinical', 'attachments', 'clinical attachments exist');
select has_column('clinical', 'attachments', 'sha256', 'attachments store integrity hashes');
select has_column('clinical', 'attachments', 'size_bytes', 'attachments store byte sizes');
select ok((select relrowsecurity from pg_class where oid = 'clinical.attachments'::regclass), 'clinical attachments enable RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'clinical.attachments'::regclass), 'clinical attachments force RLS');
select ok((select count(*) from pg_policies where schemaname = 'clinical' and tablename = 'attachments') = 1, 'clinical attachments have one owner policy');
select has_function('clinical', 'reject_clinical_record_mutation', 'clinical records have immutable trigger function');
select ok(not has_table_privilege('anon', 'clinical.attachments', 'SELECT'), 'anonymous cannot read clinical attachments');

select * from finish();
