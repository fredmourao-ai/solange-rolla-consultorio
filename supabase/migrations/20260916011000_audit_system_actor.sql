-- owners: audit
-- task-contract: docs/task-contracts/audit-system-actor.json
-- allow-static-routines: true

alter table public.audit_events
  alter column actor_user_id drop not null,
  add column actor_kind text not null default 'user'
    check (actor_kind in ('user', 'system')),
  add constraint audit_events_actor_identity_check
    check (
      (actor_kind = 'user' and actor_user_id is not null)
      or (actor_kind = 'system' and actor_user_id is null)
    );

comment on column public.audit_events.actor_kind is 'Origin class for sanitized audit events. System events never impersonate a staff user.';

drop policy audit_events_insert_self on public.audit_events;
create policy audit_events_insert_self
on public.audit_events
for insert
to authenticated
with check (
  actor_kind = 'user'
  and actor_user_id = auth.uid()
);
