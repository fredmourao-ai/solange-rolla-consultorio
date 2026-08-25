begin;

select plan(36);

select has_extension('pgmq', 'pgmq extension is enabled');

select is(
  (select array_agg(queue_name::text order by queue_name::text) from pgmq.list_queues()),
  array['automations', 'documents', 'fiscal', 'messaging']::text[],
  'exactly the four foundation queues exist'
);

select ok(not has_function_privilege('anon', 'pgmq.send(text,jsonb,integer)', 'EXECUTE'), 'anon cannot call pgmq.send directly');
select ok(not has_function_privilege('anon', 'pgmq.read(text,integer,integer)', 'EXECUTE'), 'anon cannot call pgmq.read directly');
select ok(not has_function_privilege('anon', 'pgmq.archive(text,bigint)', 'EXECUTE'), 'anon cannot call pgmq.archive directly');
select ok(not has_function_privilege('anon', 'pgmq.set_vt(text,bigint,integer)', 'EXECUTE'), 'anon cannot call pgmq.set_vt directly');

select ok(not has_function_privilege('authenticated', 'pgmq.send(text,jsonb,integer)', 'EXECUTE'), 'authenticated cannot call pgmq.send directly');
select ok(not has_function_privilege('authenticated', 'pgmq.read(text,integer,integer)', 'EXECUTE'), 'authenticated cannot call pgmq.read directly');
select ok(not has_function_privilege('authenticated', 'pgmq.archive(text,bigint)', 'EXECUTE'), 'authenticated cannot call pgmq.archive directly');
select ok(not has_function_privilege('authenticated', 'pgmq.set_vt(text,bigint,integer)', 'EXECUTE'), 'authenticated cannot call pgmq.set_vt directly');

select ok(not has_function_privilege('service_role', 'pgmq.send(text,jsonb,integer)', 'EXECUTE'), 'service_role cannot bypass the send wrapper');
select ok(not has_function_privilege('service_role', 'pgmq.read(text,integer,integer)', 'EXECUTE'), 'service_role cannot bypass the read wrapper');
select ok(not has_function_privilege('service_role', 'pgmq.archive(text,bigint)', 'EXECUTE'), 'service_role cannot bypass the archive wrapper');
select ok(not has_function_privilege('service_role', 'pgmq.set_vt(text,bigint,integer)', 'EXECUTE'), 'service_role cannot bypass the requeue wrapper');

select ok(not has_function_privilege('anon', 'public.queue_send(text,jsonb,integer)', 'EXECUTE'), 'anon cannot call queue_send');
select ok(not has_function_privilege('anon', 'public.queue_read(text,integer,integer)', 'EXECUTE'), 'anon cannot call queue_read');
select ok(not has_function_privilege('anon', 'public.queue_archive(text,text)', 'EXECUTE'), 'anon cannot call queue_archive');
select ok(not has_function_privilege('anon', 'public.queue_requeue(text,text,integer)', 'EXECUTE'), 'anon cannot call queue_requeue');

select ok(not has_function_privilege('authenticated', 'public.queue_send(text,jsonb,integer)', 'EXECUTE'), 'authenticated cannot call queue_send');
select ok(not has_function_privilege('authenticated', 'public.queue_read(text,integer,integer)', 'EXECUTE'), 'authenticated cannot call queue_read');
select ok(not has_function_privilege('authenticated', 'public.queue_archive(text,text)', 'EXECUTE'), 'authenticated cannot call queue_archive');
select ok(not has_function_privilege('authenticated', 'public.queue_requeue(text,text,integer)', 'EXECUTE'), 'authenticated cannot call queue_requeue');

select ok(has_function_privilege('service_role', 'public.queue_send(text,jsonb,integer)', 'EXECUTE'), 'service_role can call queue_send');
select ok(has_function_privilege('service_role', 'public.queue_read(text,integer,integer)', 'EXECUTE'), 'service_role can call queue_read');
select ok(has_function_privilege('service_role', 'public.queue_archive(text,text)', 'EXECUTE'), 'service_role can call queue_archive');
select ok(has_function_privilege('service_role', 'public.queue_requeue(text,text,integer)', 'EXECUTE'), 'service_role can call queue_requeue');

create temporary table queue_test_state as
select public.queue_send(
  'documents',
  '{"kind":"documents.render","idempotencyKey":"doc:123","correlationId":"request:456","payload":{"id":"123"},"createdAt":"2026-08-24T12:00:00.000Z"}'::jsonb,
  0
) as id;

create temporary table first_read as
select * from public.queue_read('documents', 30, 1);

select is(
  (select id from first_read),
  (select id from queue_test_state),
  'read returns the sent message id'
);
select is(
  (select message->>'idempotencyKey' from first_read),
  'doc:123',
  'first delivery preserves idempotency key'
);
select is(
  (select read_count from first_read),
  1::integer,
  'first delivery has read count one'
);
select is(
  (select count(*)::integer from public.queue_read('documents', 30, 1)),
  0,
  'message remains hidden during visibility timeout'
);
select ok(
  public.queue_requeue('documents', (select id from queue_test_state), 0),
  'requeue makes the message eligible again'
);

create temporary table second_read as
select * from public.queue_read('documents', 30, 1);

select is(
  (select id from second_read),
  (select id from queue_test_state),
  'redelivery returns the same message id'
);
select is(
  (select message->>'idempotencyKey' from second_read),
  'doc:123',
  'redelivery preserves idempotency key'
);
select is(
  (select read_count from second_read),
  2::integer,
  'redelivery increments read count'
);
select ok(
  public.queue_archive('documents', (select id from queue_test_state)),
  'processed message can be archived'
);
select is(
  (select queue_length from pgmq.metrics('documents')),
  0::bigint,
  'archived message is no longer active'
);

select * from finish();
rollback;
