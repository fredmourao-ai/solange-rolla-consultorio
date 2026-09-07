-- owners: audit,people
-- cross-module-task: docs/task-contracts/people-audited-creation.json
-- allow-static-routines: true

create or replace function public.audit_person_created()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id, correlation_id, metadata)
    values (auth.uid(), 'person.created', 'person', new.id, new.id::text, jsonb_build_object('fiscalReady', coalesce(new.fiscal_address, '{}'::jsonb) <> '{}'::jsonb));
  end if;
  return new;
end;
$$;

create trigger people_audit_created
after insert on public.people
for each row execute function public.audit_person_created();
