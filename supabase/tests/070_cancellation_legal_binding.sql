begin;
select plan(3);
select ok((select count(*) = 1 from information_schema.columns where table_schema = 'public' and table_name = 'cancellation_policies' and column_name = 'legal_document_version_id'), 'cancellation policies reference legal version');
select ok((select count(*) = 1 from pg_trigger where tgrelid = 'public.cancellation_policies'::regclass and tgname = 'cancellation_policies_require_legal_version'), 'cancellation policy legal binding is enforced');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.cancellation_policies'::regclass and contype = 'f' and pg_get_constraintdef(oid) like '%legal_document_version_id%'), 'cancellation policy legal version has foreign key');
select * from finish();
rollback;
