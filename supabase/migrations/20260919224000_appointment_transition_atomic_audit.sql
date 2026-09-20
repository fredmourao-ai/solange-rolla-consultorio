-- owners: appointments,audit,identity
-- cross-module-task: docs/task-contracts/appointments-transition-atomic-audit-209.json
-- allow-static-routines: true

create or replace function public.transition_appointment_status_atomic(
  p_appointment_id uuid,
  p_command text
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_current public.appointments%rowtype;
  v_next_status text;
  v_permission text;
  v_action text;
begin
  if v_actor is null then
    raise exception 'AGENDA_STATUS_FORBIDDEN' using errcode = '42501';
  end if;

  v_permission := case p_command
    when 'send_confirmation' then 'appointments.confirm'
    when 'confirm' then 'appointments.confirm'
    when 'check_in' then 'appointments.checkin'
    when 'start' then 'clinical.create'
    when 'request_reschedule' then 'appointments.reschedule'
    when 'reschedule' then 'appointments.reschedule'
    when 'cancel_in_time' then 'appointments.cancel'
    when 'cancel_late' then 'appointments.cancel'
    when 'cancel_by_provider' then 'appointments.cancel'
    when 'mark_no_show' then 'appointments.no_show'
    when 'complete' then 'appointments.complete'
    else null
  end;

  if v_permission is null or not public.has_permission(v_permission) then
    raise exception 'AGENDA_STATUS_FORBIDDEN' using errcode = '42501';
  end if;

  if p_command = 'start'
    and (
      public.current_app_role() <> 'psychologist_owner'
      or public.current_aal() <> 'aal2'
    ) then
    raise exception 'CARE_START_FORBIDDEN' using errcode = '42501';
  end if;

  select *
  into v_current
  from public.appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'AGENDA_APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_next_status := case
    when v_current.status = 'scheduled' and p_command = 'send_confirmation' then 'pending_confirmation'
    when v_current.status = 'scheduled' and p_command = 'cancel_in_time' then 'cancelled_in_time'
    when v_current.status = 'scheduled' and p_command = 'cancel_late' then 'cancelled_late'
    when v_current.status = 'scheduled' and p_command = 'cancel_by_provider' then 'cancelled_by_provider'

    when v_current.status = 'pending_confirmation' and p_command = 'confirm' then 'confirmed'
    when v_current.status = 'pending_confirmation' and p_command = 'request_reschedule' then 'reschedule_requested'
    when v_current.status = 'pending_confirmation' and p_command = 'cancel_in_time' then 'cancelled_in_time'
    when v_current.status = 'pending_confirmation' and p_command = 'cancel_late' then 'cancelled_late'
    when v_current.status = 'pending_confirmation' and p_command = 'cancel_by_provider' then 'cancelled_by_provider'

    when v_current.status = 'confirmed' and p_command = 'check_in' then 'checked_in'
    when v_current.status = 'confirmed' and p_command = 'request_reschedule' then 'reschedule_requested'
    when v_current.status = 'confirmed' and p_command = 'mark_no_show' then 'no_show'
    when v_current.status = 'confirmed' and p_command = 'cancel_in_time' then 'cancelled_in_time'
    when v_current.status = 'confirmed' and p_command = 'cancel_late' then 'cancelled_late'
    when v_current.status = 'confirmed' and p_command = 'cancel_by_provider' then 'cancelled_by_provider'

    when v_current.status = 'checked_in' and p_command = 'start' then 'in_progress'
    when v_current.status = 'checked_in' and p_command = 'cancel_by_provider' then 'cancelled_by_provider'

    when v_current.status = 'in_progress' and p_command = 'complete' then 'completed'

    when v_current.status = 'reschedule_requested' and p_command = 'reschedule' then 'rescheduled'
    when v_current.status = 'reschedule_requested' and p_command = 'cancel_by_provider' then 'cancelled_by_provider'

    when v_current.status = 'rescheduled' and p_command = 'send_confirmation' then 'pending_confirmation'
    when v_current.status = 'rescheduled' and p_command = 'confirm' then 'confirmed'
    when v_current.status = 'rescheduled' and p_command = 'request_reschedule' then 'reschedule_requested'
    when v_current.status = 'rescheduled' and p_command = 'cancel_in_time' then 'cancelled_in_time'
    when v_current.status = 'rescheduled' and p_command = 'cancel_late' then 'cancelled_late'
    when v_current.status = 'rescheduled' and p_command = 'cancel_by_provider' then 'cancelled_by_provider'
    else null
  end;

  if v_next_status is null then
    raise exception 'INVALID_APPOINTMENT_TRANSITION' using errcode = '55000';
  end if;

  update public.appointments
  set status = v_next_status
  where id = p_appointment_id;

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

  v_action := case
    when p_command = 'start' then 'appointment.care_started'
    when p_command = 'complete' then 'appointment.care_completed'
    else 'appointment.status_changed'
  end;

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    v_actor,
    v_action,
    'appointment',
    p_appointment_id,
    p_appointment_id::text,
    jsonb_build_object(
      'personId', v_current.person_id,
      'fromStatus', v_current.status,
      'toStatus', v_next_status,
      'command', p_command
    )
  );

  return v_next_status;
end;
$$;

revoke all on function public.transition_appointment_status_atomic(uuid, text)
from public, anon;
grant execute on function public.transition_appointment_status_atomic(uuid, text)
to authenticated;
