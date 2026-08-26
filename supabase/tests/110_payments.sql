begin;
select plan(4);
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'payment_refunds', 'payment refunds table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.payments'::regclass), 'payments have RLS');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.payments'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%idempotency_key%'), 'payments enforce idempotency');
select * from finish();
rollback;
