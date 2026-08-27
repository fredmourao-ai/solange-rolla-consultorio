begin;
select plan(6);

select has_table('public', 'public_rate_limits', 'rate limit table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.public_rate_limits'::regclass), 'rate limit table has RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.public_rate_limits'::regclass), 'rate limit table forces RLS');
select ok((select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'public_rate_limits' and grantee in ('anon', 'authenticated')) = 0, 'rate limit rows are not directly readable');
select has_function('public', 'consume_public_rate_limit', array['text', 'text', 'integer', 'integer'], 'atomic rate limit routine exists');
select ok((select prosecdef from pg_proc where oid = 'public.consume_public_rate_limit(text,text,integer,integer)'::regprocedure), 'rate limit routine is controlled server-side');

select * from finish();
rollback;
