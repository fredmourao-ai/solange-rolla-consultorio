-- owners: events,people
-- cross-module-task: docs/task-contracts/events.json
-- allow-static-routines: true

create table public.events (
  id uuid primary key default gen_random_uuid(), title text not null check (length(btrim(title)) > 0), description text,
  type text not null, starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null check (timezone = 'America/Sao_Paulo'),
  location text, modality text not null check (modality in ('in_person', 'online', 'hybrid')), capacity integer not null check (capacity > 0),
  default_price_cents bigint not null check (default_price_cents >= 0), required_form_template_id uuid, status text not null default 'planned' check (status in ('planned', 'open', 'full', 'completed', 'cancelled')), created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete restrict, person_id uuid not null references public.people(id) on delete restrict,
  price_cents bigint not null check (price_cents >= 0), status text not null check (status in ('confirmed', 'pending_payment', 'waitlisted', 'cancelled')), attendance_status text not null default 'unknown' check (attendance_status in ('present', 'absent', 'unknown')), created_at timestamptz not null default now()
);
create unique index event_registrations_active_person on public.event_registrations(event_id, person_id) where status <> 'cancelled';
create table public.event_registration_status_history (id uuid primary key default gen_random_uuid(), registration_id uuid not null references public.event_registrations(id) on delete restrict, status text not null, changed_at timestamptz not null default now(), actor_id uuid references auth.users(id) on delete restrict);
create table public.event_expenses (id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete restrict, description text not null, amount_cents bigint not null check (amount_cents > 0), paid_at timestamptz, created_at timestamptz not null default now());
alter table public.events enable row level security; alter table public.events force row level security;
alter table public.event_registrations enable row level security; alter table public.event_registrations force row level security;
alter table public.event_registration_status_history enable row level security; alter table public.event_registration_status_history force row level security;
alter table public.event_expenses enable row level security; alter table public.event_expenses force row level security;
create policy events_staff on public.events for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'secretary')) with check (public.current_app_role() in ('psychologist_owner', 'secretary'));
create policy event_registrations_staff on public.event_registrations for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'secretary')) with check (public.current_app_role() in ('psychologist_owner', 'secretary'));
create policy event_history_owner on public.event_registration_status_history for all to authenticated using (public.current_app_role() = 'psychologist_owner') with check (public.current_app_role() = 'psychologist_owner');
create policy event_expenses_accounting on public.event_expenses for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'accounting')) with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
revoke all on public.events, public.event_registrations, public.event_registration_status_history, public.event_expenses from anon;
grant select, insert, update on public.events, public.event_registrations, public.event_registration_status_history, public.event_expenses to authenticated;
