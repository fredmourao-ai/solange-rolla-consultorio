-- owners: appointments
-- task-contract: docs/task-contracts/appointment-atomic-response.json
-- allow-static-routines: true

create or replace function public.persist_appointment_response(
  p_appointment_id uuid,
  p_expected_status text,
  p_new_status text,
  p_capability_id uuid,
  p_response text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row text;
begin
  if p_response not in ('confirmed', 'request_reschedule', 'cancelled') then
    raise exception 'INVALID_APPOINTMENT_RESPONSE';
  end if;

  update public.appointments
  set status = p_new_status
  where id = p_appointment_id and status = p_expected_status
  returning status into current_row;
  if current_row is null then
    raise exception 'APPOINTMENT_STATE_CHANGED';
  end if;

  insert into public.appointment_confirmations (
    appointment_id, capability_id, responded_at, response
  ) values (
    p_appointment_id, p_capability_id, clock_timestamp(), p_response
  );

  return current_row;
end;
$$;

revoke all on function public.persist_appointment_response(uuid,text,text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.persist_appointment_response(uuid,text,text,uuid,text)
  to service_role;
