begin;

select plan(4);

delete from public.public_rate_limits where rate_key = repeat('d', 64);
set local role service_role;

select is(
  (select allowed from public.consume_public_rate_limit(repeat('d', 64), 'public_form_save', 2, 300)),
  true, 'first request is allowed'
);
select is(
  (select allowed from public.consume_public_rate_limit(repeat('d', 64), 'public_form_save', 2, 300)),
  true, 'request at the limit is allowed'
);
select is(
  (select allowed from public.consume_public_rate_limit(repeat('d', 64), 'public_form_save', 2, 300)),
  false, 'request over the limit is rejected'
);
select ok(
  (select retry_after_seconds > 0 from public.consume_public_rate_limit(repeat('d', 64), 'public_form_save', 2, 300)),
  'rejected request has retry interval'
);

select * from finish();
rollback;
