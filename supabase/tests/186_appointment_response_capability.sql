begin;
select plan(2);

select lives_ok($$
  insert into public.capabilities (id, token_hash, purpose, subject_type, subject_id, expires_at)
  values ('a8600000-0000-4000-8000-000000000001', repeat('a', 64), 'appointment_response', 'appointment', 'd1000000-0000-4000-8000-000000000001', clock_timestamp() + interval '10 minutes')
$$, 'appointment_response capability is accepted');

select is((select purpose from public.capabilities where id = 'a8600000-0000-4000-8000-000000000001'), 'appointment_response', 'purpose is preserved');
select * from finish();
rollback;
