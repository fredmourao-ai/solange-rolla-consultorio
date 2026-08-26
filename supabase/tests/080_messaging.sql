begin;
select plan(5);
select has_table('public', 'outbound_messages', 'outbound messages table exists');
select has_table('public', 'message_attempts', 'message attempts table exists');
select has_table('public', 'inbox_events', 'inbox events table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.outbound_messages'::regclass), 'outbound messages have RLS');
select ok((select count(*) = 1 from pg_constraint where conrelid = 'public.outbound_messages'::regclass and contype = 'u' and pg_get_constraintdef(oid) like '%idempotency_key%'), 'outbound messages enforce idempotency');
select * from finish();
rollback;
