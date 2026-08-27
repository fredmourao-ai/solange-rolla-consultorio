select plan(9);

select has_table('public', 'fiscal_cancellation_events', 'fiscal cancellation events exist');
select has_column('public', 'fiscal_documents', 'xml_sha256', 'xml integrity hash is stored');
select has_column('public', 'fiscal_documents', 'pdf_sha256', 'pdf integrity hash is stored');
select has_column('public', 'fiscal_documents', 'xml_byte_length', 'xml length is stored');
select has_column('public', 'fiscal_documents', 'pdf_byte_length', 'pdf length is stored');
select ok((select relrowsecurity from pg_class where oid = 'public.fiscal_cancellation_events'::regclass), 'cancellation events enable RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.fiscal_cancellation_events'::regclass), 'cancellation events force RLS');
select ok(not has_table_privilege('anon', 'public.fiscal_cancellation_events', 'SELECT'), 'anonymous cannot read cancellation events');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'fiscal_cancellation_events') = 1, 'cancellation events have one restricted policy');

select * from finish();
