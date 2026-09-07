-- owners: appointments,audit
-- cross-module-task: docs/task-contracts/appointments-audited-service-creation.json
-- allow-static-routines: true

create or replace function public.audit_service_created()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id, correlation_id, metadata)
    values (auth.uid(), 'service.created', 'service', new.id, new.id::text, jsonb_build_object('name', new.name, 'durationMinutes', new.duration_minutes, 'priceCents', new.price_cents));
  end if;
  return new;
end;
$$;

create trigger services_audit_created
after insert on public.services
for each row execute function public.audit_service_created();
