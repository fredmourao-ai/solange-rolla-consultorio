-- owners: events
-- task-contract: docs/task-contracts/event-operations-77.json
-- allow-static-routines: true

create or replace function public.register_event_participant_atomic(
  p_event_id uuid,
  p_person_id uuid,
  p_price_cents bigint,
  p_status text
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('psychologist_owner', 'secretary') then
    raise exception 'EVENT_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));

  if not exists (
    select 1 from public.events
    where id = p_event_id and status in ('open', 'planned')
  ) then
    raise exception 'EVENT_NOT_OPEN';
  end if;
  if (
    select count(*) from public.event_registrations
    where event_id = p_event_id and status <> 'cancelled'
  ) >= (
    select capacity from public.events where id = p_event_id
  ) then
    raise exception 'EVENT_FULL';
  end if;

  return query
  insert into public.event_registrations (event_id, person_id, price_cents, status)
  values (p_event_id, p_person_id, p_price_cents, p_status)
  returning event_registrations.id;
end;
$$;

revoke all on function public.register_event_participant_atomic(uuid, uuid, bigint, text) from public, anon;
grant execute on function public.register_event_participant_atomic(uuid, uuid, bigint, text) to authenticated;
