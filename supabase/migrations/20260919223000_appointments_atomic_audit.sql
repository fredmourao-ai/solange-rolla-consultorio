-- owners: appointments,audit
-- cross-module-task: docs/task-contracts/appointments-atomic-audit-207.json
-- allow-static-routines: true

create or replace function public.create_appointment_atomic(
  p_appointment_id uuid,
  p_person_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_policy_version integer,
  p_cancellation_deadline_at timestamptz,
  p_business_timezone text,
  p_cancellation_policy_snapshot jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null
    or public.current_app_role() not in ('psychologist_owner', 'secretary')
    or not public.has_permission('appointments.create') then
    raise exception 'APPOINTMENT_CREATE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'APPOINTMENT_INTERVAL_INVALID' using errcode = '23514';
  end if;
  if p_business_timezone <> 'America/Sao_Paulo' then
    raise exception 'APPOINTMENT_TIMEZONE_INVALID' using errcode = '23514';
  end if;

  insert into public.appointments (
    id, person_id, service_id, starts_at, ends_at, status, policy_version,
    cancellation_deadline_at, business_timezone, cancellation_policy_snapshot
  ) values (
    p_appointment_id, p_person_id, p_service_id, p_starts_at, p_ends_at, 'scheduled',
    p_policy_version, p_cancellation_deadline_at, p_business_timezone,
    p_cancellation_policy_snapshot
  );

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    actor, 'appointment.created', 'appointment', p_appointment_id, p_appointment_id::text,
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

create or replace function public.update_appointment_atomic(
  p_appointment_id uuid,
  p_person_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_next_status text,
  p_cancellation_deadline_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  current_appointment public.appointments%rowtype;
begin
  if actor is null
    or public.current_app_role() not in ('psychologist_owner', 'secretary')
    or not public.has_permission('appointments.update') then
    raise exception 'APPOINTMENT_UPDATE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'APPOINTMENT_INTERVAL_INVALID' using errcode = '23514';
  end if;

  select *
  into current_appointment
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if current_appointment.status in (
    'cancelled_in_time', 'cancelled_late', 'cancelled_by_provider',
    'completed', 'no_show'
  ) then
    raise exception 'APPOINTMENT_TERMINAL_IMMUTABLE' using errcode = '55000';
  end if;
  if p_next_status <> current_appointment.status
    and not (
      current_appointment.status = 'reschedule_requested'
      and p_next_status = 'rescheduled'
      and public.has_permission('appointments.reschedule')
    ) then
    raise exception 'APPOINTMENT_STATUS_TRANSITION_INVALID' using errcode = '23514';
  end if;

  update public.appointments
  set person_id = p_person_id,
      service_id = p_service_id,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      status = p_next_status,
      cancellation_deadline_at = p_cancellation_deadline_at
  where id = p_appointment_id;

  if p_next_status <> current_appointment.status then
    insert into public.appointment_status_history (
      appointment_id, from_status, to_status, changed_by_user_id
    ) values (
      p_appointment_id, current_appointment.status, p_next_status, actor
    );
  end if;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    actor, 'appointment.updated', 'appointment', p_appointment_id, p_appointment_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'personId', current_appointment.person_id,
        'serviceId', current_appointment.service_id,
        'startsAt', current_appointment.starts_at,
        'endsAt', current_appointment.ends_at,
        'status', current_appointment.status
      ),
      'after', jsonb_build_object(
        'personId', p_person_id,
        'serviceId', p_service_id,
        'startsAt', p_starts_at,
        'endsAt', p_ends_at,
        'status', p_next_status,
        'cancellationDeadlineAt', p_cancellation_deadline_at
      ),
      'policyVersion', current_appointment.policy_version
    )
  );

  return p_appointment_id;
end;
$$;

revoke all on function public.create_appointment_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, integer, timestamptz, text, jsonb
) from public, anon;
grant execute on function public.create_appointment_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, integer, timestamptz, text, jsonb
) to authenticated;

revoke all on function public.update_appointment_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, text, timestamptz
) from public, anon;
grant execute on function public.update_appointment_atomic(
  uuid, uuid, uuid, timestamptz, timestamptz, text, timestamptz
) to authenticated;
