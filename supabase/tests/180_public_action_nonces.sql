begin;

select plan(6);

select has_table('public', 'public_action_nonces', 'public action nonce table exists');
select has_column('public', 'public_action_nonces', 'nonce_hash', 'nonce hash column exists');
select has_column('public', 'public_action_nonces', 'consumed_at', 'consumed timestamp exists');
select has_column('public', 'public_action_nonces', 'expires_at', 'nonce expiry exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.public_action_nonces'::regclass),
  'public action nonces have RLS enabled'
);
select ok(
  (select count(*) = 1 from pg_constraint where conrelid = 'public.public_action_nonces'::regclass and contype = 'p'),
  'nonce hash is unique by primary key'
);

select * from finish();
rollback;
