-- owners: messaging
-- task-contract: docs/task-contracts/messaging.json
-- allow-static-routines: true

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  channel text not null check (channel in ('whatsapp', 'email')),
  version integer not null check (version > 0),
  body text not null,
  active boolean not null default false,
  unique (key, channel, version)
);

create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  channel text not null check (channel in ('whatsapp', 'email')),
  recipient text not null,
  template_key text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'queued' check (status in ('queued', 'dispatched', 'sent', 'failed')),
  dispatched_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_attempts (
  id uuid primary key default gen_random_uuid(),
  outbound_message_id uuid not null references public.outbound_messages (id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  provider_status text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (outbound_message_id, attempt_number)
);

create table public.inbox_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table public.message_templates enable row level security;
alter table public.message_templates force row level security;
alter table public.outbound_messages enable row level security;
alter table public.outbound_messages force row level security;
alter table public.message_attempts enable row level security;
alter table public.message_attempts force row level security;
alter table public.inbox_events enable row level security;
alter table public.inbox_events force row level security;

create policy messaging_owner_manage on public.message_templates for all to authenticated using (public.current_app_role() = 'psychologist_owner') with check (public.current_app_role() = 'psychologist_owner');
create policy messaging_staff_manage on public.outbound_messages for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'secretary')) with check (public.current_app_role() in ('psychologist_owner', 'secretary'));
create policy messaging_owner_attempts on public.message_attempts for select to authenticated using (public.current_app_role() = 'psychologist_owner');
revoke all on public.message_templates, public.outbound_messages, public.message_attempts, public.inbox_events from anon;
grant select, insert, update on public.message_templates to authenticated;
grant select, insert, update on public.outbound_messages to authenticated;
grant select on public.message_attempts to authenticated;
