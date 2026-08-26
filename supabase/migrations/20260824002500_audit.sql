-- owners: audit
-- task-contract: docs/task-contracts/audit-trail.json
-- allow-static-routines: true

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  action text not null check (length(btrim(action)) between 1 and 120),
  entity_type text not null check (length(btrim(entity_type)) between 1 and 120),
  entity_id uuid not null,
  correlation_id text not null check (length(btrim(correlation_id)) between 1 and 160),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

comment on table public.audit_events is 'Append-only sanitized audit trail; never stores clinical content or secrets.';
comment on column public.audit_events.metadata is 'Sanitized operational metadata only; content, notes, answers, tokens and secrets are prohibited.';

create index audit_events_entity_idx
on public.audit_events (entity_type, entity_id, created_at desc);

create index audit_events_actor_idx
on public.audit_events (actor_user_id, created_at desc);

create or replace function public.reject_audit_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'AUDIT_EVENTS_APPEND_ONLY' using errcode = '55000';
end;
$$;

create trigger audit_events_append_only_update
before update on public.audit_events
for each row execute function public.reject_audit_event_mutation();

create trigger audit_events_append_only_delete
before delete on public.audit_events
for each row execute function public.reject_audit_event_mutation();

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

create policy audit_events_insert_self
on public.audit_events
for insert
to authenticated
with check (actor_user_id = auth.uid());

create policy audit_events_select_owner_aal2
on public.audit_events
for select
to authenticated
using (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);

revoke all on public.audit_events from anon;
grant insert on public.audit_events to authenticated;
grant select on public.audit_events to authenticated;
