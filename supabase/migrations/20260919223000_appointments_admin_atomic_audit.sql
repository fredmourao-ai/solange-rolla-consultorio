-- owners: appointments,audit
-- cross-module-task: docs/task-contracts/appointments-admin-atomic-audit-207.json
-- allow-static-routines: true

create or replace function public.appointment_cancellation_deadline_from_snapshot(
  p_starts_at timestamptz,
  p_snapshot jsonb
)
returns timestamptz
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_countable_hours integer;
  v_excluded_weekdays jsonb;
  v_timezone text;
  v_local_start timestamp;
  v_candidate_date date;
  v_remaining_days integer;
  v_consumed_days integer := 0;
  v_weekday integer;
  v_index integer;
begin
  if coalesce(jsonb_typeof(p_snapshot), '') <> 'object'
    or coalesce(jsonb_typeof(p_snapshot -> 'policyVersion'), '') <> 'number'
    or coalesce(jsonb_typeof(p_snapshot -> 'countableHours'), '') <> 'number'
    or coalesce(jsonb_typeof(p_snapshot -> 'excludedWeekdays'), '') <> 'array'
    or coalesce(jsonb_typeof(p_snapshot -> 'businessTimezone'), '') <> 'string'
    or coalesce(jsonb_typeof(p_snapshot -> 'lateCancellationChargeEnabled'), '') <> 'boolean'
    or coalesce(jsonb_typeof(p_snapshot -> 'noShowChargeEnabled'), '') <> 'boolean' then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;

  v_countable_hours := (p_snapshot ->> 'countableHours')::integer;
  v_excluded_weekdays := p_snapshot -> 'excludedWeekdays';
  v_timezone := p_snapshot ->> 'businessTimezone';

  if v_countable_hours <= 0
    or mod(v_countable_hours, 24) <> 0
    or jsonb_array_length(v_excluded_weekdays) = 0
    or v_timezone <> 'America/Sao_Paulo' then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;

  for v_index in 0..jsonb_array_length(v_excluded_weekdays) - 1 loop
    if coalesce(jsonb_typeof(v_excluded_weekdays -> v_index), '') <> 'number'
      or (v_excluded_weekdays ->> v_index)::integer not between 0 and 6 then
      raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
    end if;
  end loop;

  v_local_start := p_starts_at at time zone v_timezone;
  v_candidate_date := v_local_start::date;
  v_remaining_days := v_countable_hours / 24;

  while v_consumed_days < v_remaining_days loop
    v_candidate_date := v_candidate_date - 1;
    v_weekday := date_part('dow', v_candidate_date)::integer;
    if not (v_excluded_weekdays @> jsonb_build_array(v_weekday)) then
      v_consumed_days := v_consumed_days + 1;
    end if;
  end loop;

  return (v_candidate_date + v_local_start::time) at time zone v_timezone;
end;
$$;

revoke all on function public.appointment_cancellation_deadline_from_snapshot(timestamptz, jsonb) from public, anon;
grant execute on function public.appointment_cancellation_deadline_from_snapshot(timestamptz, jsonb) to authenticated;

create or replace function public.create_appointment_with_audit_atomic(
  p_appointment_id uuid,
  p_person_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_policy_version integer,
  p_cancellation_deadline_at timestamptz,
  p_cancellation_policy_snapshot jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_app_role();
  v_service_duration integer;
  v_policy public.cancellation_policies%rowtype;
  v_expected_snapshot jsonb;
  v_expected_deadline timestamptz;
begin
  if v_actor is null
    or v_role not in ('psychologist_owner', 'secretary')
    or not public.has_permission('appointments.create') then
    raise exception 'AGENDA_APPOINTMENT_WRITE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'AGENDA_INVALID_INTERVAL' using errcode = '22007';
  end if;
  select s.duration_minutes
  into v_service_duration
  from public.services s
  where s.id = p_service_id
    and s.active;

  if v_service_duration is null then
    raise exception 'AGENDA_SERVICE_NOT_AVAILABLE' using errcode = '23503';
  end if;
  if p_ends_at <> p_starts_at + make_interval(mins => v_service_duration) then
    raise exception 'AGENDA_SERVICE_DURATION_MISMATCH' using errcode = '23514';
  end if;

  select p.*
  into v_policy
  from public.cancellation_policies p
  where p.effective_from <= p_starts_at
  order by p.effective_from desc, p.policy_version desc
  limit 1;

  if not found or v_policy.policy_version <> p_policy_version then
    raise exception 'AGENDA_POLICY_VERSION_INVALID' using errcode = '23514';
  end if;

  v_expected_snapshot := jsonb_build_object(
    'policyVersion', v_policy.policy_version,
    'countableHours', v_policy.countable_hours,
    'excludedWeekdays', v_policy.excluded_weekdays,
    'businessTimezone', v_policy.business_timezone,
    'lateCancellationChargeEnabled', v_policy.late_cancellation_charge_enabled,
    'noShowChargeEnabled', v_policy.no_show_charge_enabled
  );
  if p_cancellation_policy_snapshot <> v_expected_snapshot then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;

  v_expected_deadline := public.appointment_cancellation_deadline_from_snapshot(
    p_starts_at,
    v_expected_snapshot
  );
  if p_cancellation_deadline_at <> v_expected_deadline then
    raise exception 'AGENDA_CANCELLATION_DEADLINE_INVALID' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('solange:appointment-calendar', 0));

  if exists (
    select 1
    from public.appointments a
    where a.starts_at < p_ends_at
      and a.ends_at > p_starts_at
      and a.status not in ('cancelled_in_time', 'cancelled_late', 'cancelled_by_provider')
  ) then
    raise exception 'AGENDA_TIME_CONFLICT' using errcode = '23P01';
  end if;

  insert into public.appointments (
    id,
    person_id,
    service_id,
    starts_at,
    ends_at,
    status,
    policy_version,
    cancellation_deadline_at,
    business_timezone,
    cancellation_policy_snapshot
  ) values (
    p_appointment_id,
    p_person_id,
    p_service_id,
    p_starts_at,
    p_ends_at,
    'scheduled',
    p_policy_version,
    p_cancellation_deadline_at,
    'America/Sao_Paulo',
    p_cancellation_policy_snapshot
  );

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    v_actor,
    'appointment.created',
    'appointment',
    p_appointment_id,
    p_appointment_id::text,
    jsonb_build_object(
      'personId', p_person_id,
      'serviceId', p_service_id,
      'startsAt', p_starts_at,
      'endsAt', p_ends_at,
      'policyVersion', p_policy_version
    )
  );

  return p_appointment_id;
end;
$$;

revoke all on function public.create_appointment_with_audit_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, integer, timestamptz, jsonb
) from public, anon;
grant execute on function public.create_appointment_with_audit_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, integer, timestamptz, jsonb
) to authenticated;

create or replace function public.update_appointment_with_audit_atomic(
  p_appointment_id uuid,
  p_person_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_cancellation_deadline_at timestamptz
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_app_role();
  v_current public.appointments%rowtype;
  v_next_status text;
  v_service_duration integer;
  v_expected_deadline timestamptz;
begin
  if v_actor is null
    or v_role not in ('psychologist_owner', 'secretary')
    or not public.has_permission('appointments.update') then
    raise exception 'AGENDA_APPOINTMENT_WRITE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'AGENDA_INVALID_INTERVAL' using errcode = '22007';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('solange:appointment-calendar', 0));

  select *
  into v_current
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'AGENDA_APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_current.status in (
    'cancelled_in_time',
    'cancelled_late',
    'cancelled_by_provider',
    'completed',
    'no_show'
  ) then
    raise exception 'AGENDA_TERMINAL_APPOINTMENT_IMMUTABLE' using errcode = '55000';
  end if;
  select s.duration_minutes
  into v_service_duration
  from public.services s
  where s.id = p_service_id
    and s.active;

  if v_service_duration is null then
    raise exception 'AGENDA_SERVICE_NOT_AVAILABLE' using errcode = '23503';
  end if;
  if p_ends_at <> p_starts_at + make_interval(mins => v_service_duration) then
    raise exception 'AGENDA_SERVICE_DURATION_MISMATCH' using errcode = '23514';
  end if;
  if (p_starts_at <> v_current.starts_at or p_ends_at <> v_current.ends_at)
    and not public.has_permission('appointments.reschedule') then
    raise exception 'AGENDA_RESCHEDULE_FORBIDDEN' using errcode = '42501';
  end if;

  v_expected_deadline := public.appointment_cancellation_deadline_from_snapshot(
    p_starts_at,
    v_current.cancellation_policy_snapshot
  );
  if p_cancellation_deadline_at <> v_expected_deadline then
    raise exception 'AGENDA_CANCELLATION_DEADLINE_INVALID' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.id <> p_appointment_id
      and a.starts_at < p_ends_at
      and a.ends_at > p_starts_at
      and a.status not in ('cancelled_in_time', 'cancelled_late', 'cancelled_by_provider')
  ) then
    raise exception 'AGENDA_TIME_CONFLICT' using errcode = '23P01';
  end if;

  v_next_status := case
    when v_current.status = 'reschedule_requested' then 'rescheduled'
    else v_current.status
  end;

  update public.appointments
  set person_id = p_person_id,
      service_id = p_service_id,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      status = v_next_status,
      cancellation_deadline_at = p_cancellation_deadline_at
  where id = p_appointment_id;

  if v_next_status <> v_current.status then
    insert into public.appointment_status_history (
      appointment_id,
      from_status,
      to_status,
      changed_by_user_id
    ) values (
      p_appointment_id,
      v_current.status,
      v_next_status,
      v_actor
    );
  end if;

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    v_actor,
    'appointment.updated',
    'appointment',
    p_appointment_id,
    p_appointment_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'personId', v_current.person_id,
        'serviceId', v_current.service_id,
        'startsAt', v_current.starts_at,
        'endsAt', v_current.ends_at,
        'status', v_current.status
      ),
      'after', jsonb_build_object(
        'personId', p_person_id,
        'serviceId', p_service_id,
        'startsAt', p_starts_at,
        'endsAt', p_ends_at,
        'status', v_next_status,
        'cancellationDeadlineAt', p_cancellation_deadline_at
      ),
      'policyVersion', v_current.policy_version
    )
  );

  return v_next_status;
end;
$$;

revoke all on function public.update_appointment_with_audit_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, timestamptz
) from public, anon;
grant execute on function public.update_appointment_with_audit_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, timestamptz
) to authenticated;
