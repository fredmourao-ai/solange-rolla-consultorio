begin;
select plan(4);

select has_function('public', 'exchange_capability', array['text', 'text', 'timestamp with time zone'], 'capability exchange routine exists');
select ok((select prosecdef from pg_proc where oid = 'public.exchange_capability(text,text,timestamptz)'::regprocedure), 'exchange routine is security definer');
select ok((select count(*) = 0 from information_schema.role_routine_grants where routine_schema = 'public' and routine_name = 'exchange_capability' and grantee in ('anon', 'authenticated')), 'clients cannot exchange capability tokens directly');
select ok((select count(*) = 1 from information_schema.role_routine_grants where routine_schema = 'public' and routine_name = 'exchange_capability' and grantee = 'service_role'), 'only server role can exchange capability tokens');

select * from finish();
rollback;
