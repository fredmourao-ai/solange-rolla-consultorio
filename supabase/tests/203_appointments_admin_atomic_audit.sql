begin;

select plan(28);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a2070000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'agenda-atomic-owner@example.test', 'synthetic', now(), '{}', '{}'),
  ('a2070000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'agenda-atomic-accounting@example.test', 'synthetic', now(), '{}', '{}'),
  ('a2070000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'agenda-atomic-denied@example.test', 'synthetic', now(), '{}', '{}'),
  ('a2070000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'agenda-atomic-no-reschedule@example.test', 'synthetic', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('a2070000-0000-4000-8000-000000000001', 'psychologist_owner', 'Agenda Atomic Owner'),
  ('a2070000-0000-4000-8000-000000000002', 'accounting', 'Agenda Atomic Accounting'),
  ('a2070000-0000-4000-8000-000000000003', 'psychologist_owner', 'Agenda Atomic Denied'),
  ('a2070000-0000-4000-8000-000000000004', 'psychologist_owner', 'Agenda Atomic No Reschedule');

insert into public.user_permission_overrides (
  user_id, permission_key, allowed, changed_by_user_id
) values
  ('a2070000-0000-4000-8000-000000000003', 'appointments.create', false, 'a2070000-0000-4000-8000-000000000001'),
  ('a2070000-0000-4000-8000-000000000003', 'appointments.update', false, 'a2070000-0000-4000-8000-000000000001'),
  ('a2070000-0000-4000-8000-000000000004', 'appointments.reschedule', false, 'a2070000-0000-4000-8000-000000000001');

insert into public.people (id, civil_name, birth_date)
values
  ('a2070000-0000-4000-8000-000000000011', 'Paciente Agenda A', '1990-01-01'),
  ('a2070000-0000-4000-8000-000000000012', 'Paciente Agenda B', '1991-01-01');

insert into public.legal_document_versions (
  document_id, version, content, content_hash_sha256, effective_from, is_draft
)
select id, 207, 'Synthetic agenda atomic cancellation policy', repeat('a', 64), '2030-01-01T00:00:00Z', false
from public.legal_documents
where key = 'cancellation_policy';

insert into public.cancellation_policies (
  policy_version,
  countable_hours,
  excluded_weekdays,
  business_timezone,
  late_cancellation_charge_enabled,
  no_show_charge_enabled,
  effective_from,
  legal_document_version_id
)
values (
  207,
  48,
  '[0,6]'::jsonb,
  'America/Sao_Paulo',
  true,
  true,
  '2030-01-01T00:00:00Z',
  (
    select id from public.legal_document_versions
    where document_id = (select id from public.legal_documents where key = 'cancellation_policy')
      and version = 207
  )
);

insert into public.services (id, name, duration_minutes, price_cents, active)
values ('a2070000-0000-4000-8000-000000000021', 'Consulta Agenda Atomic', 50, 12000, true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2070000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000101',
    'a2070000-0000-4000-8000-000000000011',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-01T13:00:00Z',
    '2035-01-01T13:50:00Z',
    207,
    '2034-12-28T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  ),
  'a2070000-0000-4000-8000-000000000101'::uuid,
  'atomic create returns appointment id'
);

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2070000-0000-4000-8000-000000000101'
    and action = 'appointment.created'
), 1, 'atomic create writes one audit event');


select throws_ok($
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000106',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-05T13:00:00Z',
    '2035-01-05T14:00:00Z',
    207,
    '2035-01-03T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$, '23514', 'AGENDA_SERVICE_DURATION_MISMATCH', 'direct RPC cannot forge service duration');

select throws_ok($
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000107',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-05T13:00:00Z',
    '2035-01-05T13:50:00Z',
    1,
    '2035-01-03T13:00:00Z',
    '{"policyVersion":1,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$, '23514', 'AGENDA_POLICY_VERSION_INVALID', 'direct RPC cannot select a stale policy version');

select throws_ok($
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000108',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-05T13:00:00Z',
    '2035-01-05T13:50:00Z',
    207,
    '2035-01-03T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":false}'::jsonb
  )
$, '23514', 'AGENDA_POLICY_SNAPSHOT_INVALID', 'direct RPC cannot forge cancellation policy snapshot');

select throws_ok($
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000109',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-05T13:00:00Z',
    '2035-01-05T13:50:00Z',
    207,
    '2035-01-02T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$, '23514', 'AGENDA_CANCELLATION_DEADLINE_INVALID', 'direct RPC cannot forge cancellation deadline');

select is((
  select count(*)::integer
  from public.appointments
  where id in (
    'a2070000-0000-4000-8000-000000000106',
    'a2070000-0000-4000-8000-000000000107',
    'a2070000-0000-4000-8000-000000000108',
    'a2070000-0000-4000-8000-000000000109'
  )
), 0, 'invalid direct RPC inputs persist no appointments');

select throws_ok($$
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000102',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-01T13:20:00Z',
    '2035-01-01T14:10:00Z',
    207,
    '2034-12-28T13:20:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$$, '23P01', 'AGENDA_TIME_CONFLICT', 'overlap is rejected inside atomic create');

select is((
  select count(*)::integer from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000102'
), 0, 'overlap leaves no appointment');

select public.create_appointment_with_audit_atomic(
  'a2070000-0000-4000-8000-000000000103',
  'a2070000-0000-4000-8000-000000000011',
  'a2070000-0000-4000-8000-000000000021',
  '2035-01-02T13:00:00Z',
  '2035-01-02T13:50:00Z',
  207,
  '2034-12-29T13:00:00Z',
  '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
);

reset role;
update public.appointments
set status = 'reschedule_requested'
where id = 'a2070000-0000-4000-8000-000000000103';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2070000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  public.update_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000103',
    'a2070000-0000-4000-8000-000000000011',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-02T14:00:00Z',
    '2035-01-02T14:50:00Z',
    '2034-12-29T14:00:00Z'
  ),
  'rescheduled',
  'atomic update preserves reschedule state machine'
);

select is((
  select status from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000103'
), 'rescheduled', 'atomic update persists next status');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2070000-0000-4000-8000-000000000103'
    and from_status = 'reschedule_requested'
    and to_status = 'rescheduled'
), 1, 'atomic update writes one status-history row');

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2070000-0000-4000-8000-000000000103'
    and action = 'appointment.updated'
), 1, 'atomic update writes one audit event');

reset role;

create or replace function pg_temp.reject_agenda_atomic_audit()
returns trigger
language plpgsql
as $$
begin
  if new.entity_type = 'appointment'
    and new.entity_id in (
      'a2070000-0000-4000-8000-000000000103'::uuid,
      'a2070000-0000-4000-8000-000000000104'::uuid
    ) then
    raise exception 'AGENDA_SYNTHETIC_AUDIT_REJECTED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reject_agenda_atomic_audit
before insert on public.audit_events
for each row execute function pg_temp.reject_agenda_atomic_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2070000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000104',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-03T13:00:00Z',
    '2035-01-03T13:50:00Z',
    207,
    '2035-01-01T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$$, 'P0001', 'AGENDA_SYNTHETIC_AUDIT_REJECTED', 'create audit failure aborts appointment');

select is((
  select count(*)::integer from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000104'
), 0, 'create audit failure rolls back appointment');

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2070000-0000-4000-8000-000000000104'
), 0, 'create audit failure leaves no audit event');

select throws_ok($$
  select public.update_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000103',
    'a2070000-0000-4000-8000-000000000011',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-02T15:00:00Z',
    '2035-01-02T15:50:00Z',
    '2034-12-29T15:00:00Z'
  )
$$, 'P0001', 'AGENDA_SYNTHETIC_AUDIT_REJECTED', 'update audit failure aborts appointment mutation');

select is((
  select starts_at from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000103'
), '2035-01-02T14:00:00Z'::timestamptz, 'update audit failure preserves previous appointment timestamp');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2070000-0000-4000-8000-000000000103'
), 1, 'update audit failure adds no status-history row');

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2070000-0000-4000-8000-000000000103'
    and action = 'appointment.updated'
), 1, 'update audit failure adds no second audit event');

reset role;
drop trigger reject_agenda_atomic_audit on public.audit_events;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2070000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000110',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-08T13:00:00Z',
    '2035-01-08T13:50:00Z',
    207,
    '2035-01-04T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$$, '42501', 'AGENDA_APPOINTMENT_WRITE_FORBIDDEN', 'explicit appointments.create deny blocks direct RPC');

select is((
  select count(*)::integer from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000110'
), 0, 'create permission deny persists no appointment');

select throws_ok($$
  select public.update_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000103',
    'a2070000-0000-4000-8000-000000000011',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-02T16:00:00Z',
    '2035-01-02T16:50:00Z',
    '2034-12-29T16:00:00Z'
  )
$$, '42501', 'AGENDA_APPOINTMENT_WRITE_FORBIDDEN', 'explicit appointments.update deny blocks direct RPC');

select is((
  select starts_at from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000103'
), '2035-01-02T14:00:00Z'::timestamptz, 'update permission deny preserves appointment');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2070000-0000-4000-8000-000000000004","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.update_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000103',
    'a2070000-0000-4000-8000-000000000011',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-02T16:00:00Z',
    '2035-01-02T16:50:00Z',
    '2034-12-29T16:00:00Z'
  )
$$, '42501', 'AGENDA_RESCHEDULE_FORBIDDEN', 'explicit appointments.reschedule deny blocks time changes');

select is((
  select starts_at from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000103'
), '2035-01-02T14:00:00Z'::timestamptz, 'reschedule permission deny preserves appointment');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2070000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.create_appointment_with_audit_atomic(
    'a2070000-0000-4000-8000-000000000105',
    'a2070000-0000-4000-8000-000000000012',
    'a2070000-0000-4000-8000-000000000021',
    '2035-01-04T13:00:00Z',
    '2035-01-04T13:50:00Z',
    207,
    '2035-01-02T13:00:00Z',
    '{"policyVersion":207,"countableHours":48,"excludedWeekdays":[0,6],"businessTimezone":"America/Sao_Paulo","lateCancellationChargeEnabled":true,"noShowChargeEnabled":true}'::jsonb
  )
$$, '42501', 'AGENDA_APPOINTMENT_WRITE_FORBIDDEN', 'accounting cannot create appointment');

select is((
  select count(*)::integer from public.appointments
  where id = 'a2070000-0000-4000-8000-000000000105'
), 0, 'forbidden create leaves no row');

select * from finish();
rollback;
