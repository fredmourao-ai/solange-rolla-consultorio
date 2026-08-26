begin;

select plan(4);

select has_table('public', 'capabilities', 'capabilities table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.capabilities'::regclass), 'capabilities has RLS enabled');

set local role anon;
select throws_ok($$ select count(*) from public.capabilities $$, '42501', null, 'anonymous cannot read capabilities');
reset role;

set local role authenticated;
select throws_ok($$ select count(*) from public.capabilities $$, '42501', null, 'authenticated users cannot read capabilities directly');

select * from finish();
rollback;
