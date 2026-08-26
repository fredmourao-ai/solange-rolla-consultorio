begin;
select plan(3);
select has_table('public', 'appointment_confirmations', 'appointment confirmations table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.appointment_confirmations'::regclass), 'appointment confirmations have RLS');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.appointment_confirmations'::regclass and contype = 'f' and pg_get_constraintdef(oid) like '%appointment_id%'), 'confirmation references appointment');
select * from finish();
rollback;
