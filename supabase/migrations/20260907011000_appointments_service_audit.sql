-- owners: appointments,audit
-- cross-module-task: docs/task-contracts/service-creation-audit.json
-- allow-static-routines: true

create or replace function public.create_service_with_audit(
  p_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_price_cents bigint
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.current_app_role() not in ('psychologist_owner', 'secretary') then
    raise exception 'AGENDA_FORBIDDEN';
  end if;
  if length(btrim(p_name)) < 1 or p_duration_minutes <= 0 or p_price_cents <= 0 then
    raise exception 'AGENDA_SERVICE_INVALID';
  end if;
  insert into public.services (id, name, duration_minutes, price_cents, active)
  values (p_id, btrim(p_name), p_duration_minutes, p_price_cents, true)
;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    auth.uid(), 'service.created', 'service', p_id, p_id::text,
    jsonb_build_object(
      'name', btrim(p_name),
      'durationMinutes', p_duration_minutes,
      'priceCents', p_price_cents
    )
  );

  return p_id;
end;
$$;

revoke all on function public.create_service_with_audit(uuid, text, integer, bigint) from public, anon;
grant execute on function public.create_service_with_audit(uuid, text, integer, bigint) to authenticated;
