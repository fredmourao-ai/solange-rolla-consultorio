begin;

select plan(3);

insert into public.capabilities (
  id, token_hash, purpose, subject_type, subject_id, expires_at
) values (
  '11111111-1111-4111-8111-111111111111', repeat('a', 64),
  'form_fill', 'form_submission', '22222222-2222-4222-8222-222222222222',
  clock_timestamp() + interval '10 minutes'
);

set local role service_role;
select lives_ok(
  $$select * from public.exchange_capability(repeat('a', 64), 'form_fill', clock_timestamp())$$,
  'service role can exchange a valid capability'
);
select is(
  (select count(*)::integer from public.capabilities where token_hash = repeat('a', 64) and used_at is not null),
  1, 'exchange marks the capability as used'
);
select is(
  (select count(*)::integer from public.exchange_capability(repeat('a', 64), 'form_fill', clock_timestamp())),
  0, 'exchange is one-time'
);

select * from finish();
rollback;
