begin;
select plan(4);
select has_table('public', 'receivables', 'receivables table exists');
select has_table('public', 'receivable_adjustments', 'receivable adjustments table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.receivables'::regclass), 'receivables have RLS');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.receivables'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%idempotency_key%'), 'receivables enforce idempotency');
select * from finish();
rollback;
