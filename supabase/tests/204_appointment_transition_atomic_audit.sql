begin;

select plan(20);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a2090000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'transition-owner@example.test', 'synthetic', now(), '{}', '{}'),
  ('a2090000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'transition-accounting@example.test', 'synthetic', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name)
values
  ('a2090000-0000-4000-8000-000000000001', 'psychologist_owner', 'Transition Owner'),
  ('a2090000-0000-4000-8000-000000000002', 'accounting', 'Transition Accounting');

insert into public.people (id, civil_name, birth_date)
values ('a2090000-0000-4000-8000-000000000011', 'Paciente Transition', '1990-01-01');

insert into public.services (id, name, duration_minutes, price_cents, active)
values ('a2090000-0000-4000-8000-000000000021', 'Consulta Transition', 50, 10000, true);

insert into public.appointments (
  id, person_id, service_id, starts_at, ends_at, status, policy_version,
  cancellation_deadline_at, business_timezone, cancellation_policy_snapshot
)
select
  appointment_id,
  'a2090000-0000-4000-8000-000000000011'::uuid,
  'a2090000-0000-4000-8000-000000000021'::uuid,
  starts_at,
  starts_at + interval '50 minutes',
  'confirmed',
  policy.policy_version,
  starts_at - interval '4 days',
  'America/Sao_Paulo',
  jsonb_build_object(
    'policyVersion', policy.policy_version,
    'countableHours', policy.countable_hours,
    'excludedWeekdays', policy.excluded_weekdays,
    'businessTimezone', policy.business_timezone,
    'lateCancellationChargeEnabled', policy.late_cancellation_charge_enabled,
    'noShowChargeEnabled', policy.no_show_charge_enabled
  )
from (
  values
    ('a2090000-0000-4000-8000-000000000101'::uuid, '2035-02-01T13:00:00Z'::timestamptz),
    ('a2090000-0000-4000-8000-000000000102'::uuid, '2035-02-02T13:00:00Z'::timestamptz),
    ('a2090000-0000-4000-8000-000000000103'::uuid, '2035-02-03T13:00:00Z'::timestamptz)
) input(appointment_id, starts_at)
cross join lateral (
  select *
  from public.cancellation_policies
  order by effective_from
  limit 1
) policy;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2090000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000101',
    'check_in'
  ),
  'checked_in',
  'check-in transition returns checked_in'
);

select is((
  select status from public.appointments
  where id = 'a2090000-0000-4000-8000-000000000101'
), 'checked_in', 'check-in persists appointment status');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2090000-0000-4000-8000-000000000101'
    and from_status = 'confirmed'
    and to_status = 'checked_in'
), 1, 'check-in writes one status-history row');

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2090000-0000-4000-8000-000000000101'
    and action = 'appointment.status_changed'
    and metadata->>'command' = 'check_in'
), 1, 'check-in writes one status audit');

select throws_ok($$
  select public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000101',
    'complete'
  )
$$, '55000', 'INVALID_APPOINTMENT_TRANSITION', 'invalid transition is rejected in SQL');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2090000-0000-4000-8000-000000000101'
), 1, 'invalid transition adds no history');

select set_config(
  'request.jwt.claims',
  '{"sub":"a2090000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000101',
    'start'
  )
$$, '42501', 'CARE_START_FORBIDDEN', 'care start requires owner AAL2');

select is((
  select status from public.appointments
  where id = 'a2090000-0000-4000-8000-000000000101'
), 'checked_in', 'AAL1 denial leaves status unchanged');

select set_config(
  'request.jwt.claims',
  '{"sub":"a2090000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000101',
    'start'
  ),
  'in_progress',
  'care start transitions checked-in to in-progress'
);

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2090000-0000-4000-8000-000000000101'
    and action = 'appointment.care_started'
), 1, 'care start writes one dedicated audit event');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2090000-0000-4000-8000-000000000101'
), 2, 'care start appends one history row');

select is(
  public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000101',
    'complete'
  ),
  'completed',
  'care complete transitions in-progress to completed'
);

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2090000-0000-4000-8000-000000000101'
    and action = 'appointment.care_completed'
), 1, 'care complete writes one dedicated audit event');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2090000-0000-4000-8000-000000000101'
), 3, 'care complete appends one history row');

reset role;

create or replace function pg_temp.reject_transition_audit()
returns trigger
language plpgsql
as $$
begin
  if new.entity_type = 'appointment'
    and new.entity_id = 'a2090000-0000-4000-8000-000000000102'::uuid then
    raise exception 'AGENDA_TRANSITION_AUDIT_REJECTED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reject_transition_audit
before insert on public.audit_events
for each row execute function pg_temp.reject_transition_audit();

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2090000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000102',
    'check_in'
  )
$$, 'P0001', 'AGENDA_TRANSITION_AUDIT_REJECTED', 'audit failure aborts status transition');

select is((
  select status from public.appointments
  where id = 'a2090000-0000-4000-8000-000000000102'
), 'confirmed', 'audit failure rolls status back');

select is((
  select count(*)::integer from public.appointment_status_history
  where appointment_id = 'a2090000-0000-4000-8000-000000000102'
), 0, 'audit failure rolls history back');

select is((
  select count(*)::integer from public.audit_events
  where entity_type = 'appointment'
    and entity_id = 'a2090000-0000-4000-8000-000000000102'
), 0, 'audit failure leaves no partial audit event');

reset role;
drop trigger reject_transition_audit on public.audit_events;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a2090000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok($$
  select public.transition_appointment_status_atomic(
    'a2090000-0000-4000-8000-000000000103',
    'check_in'
  )
$$, '42501', 'AGENDA_STATUS_FORBIDDEN', 'accounting cannot transition appointment');

select is((
  select status from public.appointments
  where id = 'a2090000-0000-4000-8000-000000000103'
), 'confirmed', 'forbidden transition leaves status unchanged');

select * from finish();
rollback;
