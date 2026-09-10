begin;
select plan(17);

select has_function('public', 'record_receivable_payment_atomic', array['uuid','bigint','text','text'], 'atomic receivable payment RPC exists');
select has_function('public', 'refund_receivable_payment_atomic', array['uuid','bigint','text','text','text'], 'atomic refund RPC exists');
select has_function('public', 'record_payable_payment_atomic', array['uuid','bigint','text','text'], 'atomic payable payment RPC exists');
select ok(not has_function_privilege('anon', 'public.record_receivable_payment_atomic(uuid,bigint,text,text)', 'execute'), 'anon cannot execute receivable payment RPC');
select ok(not has_function_privilege('anon', 'public.refund_receivable_payment_atomic(uuid,bigint,text,text,text)', 'execute'), 'anon cannot execute refund RPC');
select ok(not has_function_privilege('anon', 'public.record_payable_payment_atomic(uuid,bigint,text,text)', 'execute'), 'anon cannot execute payable payment RPC');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d9000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}', true);

insert into public.receivables (id, source_type, source_id, person_id, payer_person_id, original_amount_cents, idempotency_key, status)
values ('e2000000-0000-4000-8000-000000000001', 'audit_test', 'e2100000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 30000, 'audit-receivable-atomic', 'open');

select is(public.record_receivable_payment_atomic('e2000000-0000-4000-8000-000000000001',10000,'pix','audit-payment-1')::text,
          public.record_receivable_payment_atomic('e2000000-0000-4000-8000-000000000001',10000,'pix','audit-payment-1')::text,
          'same receivable payment idempotency key returns the same payment');select throws_ok($$ select public.record_receivable_payment_atomic('e2000000-0000-4000-8000-000000000001',9000,'pix','audit-payment-1') $$,
                 'P0001','FINANCE_IDEMPOTENCY_CONFLICT','same payment idempotency key rejects a different payload');
select throws_ok($$ select public.record_receivable_payment_atomic('e2000000-0000-4000-8000-000000000001',25000,'pix','audit-payment-over') $$,
                 'P0001','PAYMENT_EXCEEDS_BALANCE','payment cannot exceed remaining receivable balance');

select lives_ok($$ select public.refund_receivable_payment_atomic((select id from public.payments where idempotency_key='audit-payment-1'),6000,'pix','teste','audit-refund-1') $$,
                'partial refund succeeds');
select throws_ok($$ select public.refund_receivable_payment_atomic((select id from public.payments where idempotency_key='audit-payment-1'),5000,'pix','teste','audit-refund-over') $$,
                 'P0001','FINANCE_REFUND_EXCEEDS_PAYMENT','cumulative refunds cannot exceed original payment');

insert into public.vendors (id, legal_name) values ('e3000000-0000-4000-8000-000000000001','Fornecedor Atomic Test');
insert into public.expense_categories (id, name) values ('e3100000-0000-4000-8000-000000000001','atomic-test');
insert into public.payables (id,vendor_id,category_id,description,amount_cents,due_date,competence,idempotency_key)
values ('e3200000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','e3100000-0000-4000-8000-000000000001','Conta atomic test',10000,current_date,current_date,'audit-payable-atomic');

select is(public.record_payable_payment_atomic('e3200000-0000-4000-8000-000000000001',6000,'pix','audit-payable-payment-1')::text,
          public.record_payable_payment_atomic('e3200000-0000-4000-8000-000000000001',6000,'pix','audit-payable-payment-1')::text,
          'same payable payment key returns the same payment');select throws_ok($$ select public.record_payable_payment_atomic('e3200000-0000-4000-8000-000000000001',5000,'pix','audit-payable-payment-1') $$,
                 'P0001','FINANCE_IDEMPOTENCY_CONFLICT','same payable payment key rejects a different payload');
select throws_ok($$ select public.record_payable_payment_atomic('e3200000-0000-4000-8000-000000000001',5000,'pix','audit-payable-payment-over') $$,
                 'P0001','FINANCE_PAYABLE_PAYMENT_INVALID','payable payment cannot exceed remaining balance');
select lives_ok($$ select public.record_payable_payment_atomic('e3200000-0000-4000-8000-000000000001',4000,'pix','audit-payable-payment-2') $$,
                'remaining payable balance can be paid exactly');
select is((select paid_cents::text || ':' || status from public.payables where id='e3200000-0000-4000-8000-000000000001'), '10000:paid',
          'payable aggregate and status remain consistent');
select is((select count(*)::int from public.audit_events where actor_user_id='d9000000-0000-4000-8000-000000000001' and entity_id in (
  (select id from public.payments where idempotency_key='audit-payment-1'),
  (select id from public.payment_refunds where idempotency_key='audit-refund-1'),
  (select id from public.payable_payments where idempotency_key='audit-payable-payment-1'),
  (select id from public.payable_payments where idempotency_key='audit-payable-payment-2')
)), 4, 'financial effects write one audit event in the same transaction');

select * from finish();
rollback;