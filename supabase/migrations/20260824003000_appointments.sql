-- owners: appointments,people
-- cross-module-task: docs/task-contracts/appointments.json
-- allow-static-routines: true

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents bigint not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cancellation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_version integer not null unique check (policy_version > 0),
  countable_hours integer not null check (countable_hours > 0),
  excluded_weekdays jsonb not null check (jsonb_typeof(excluded_weekdays) = 'array'),
  business_timezone text not null check (business_timezone = 'America/Sao_Paulo'),
  late_cancellation_charge_enabled boolean not null,
  no_show_charge_enabled boolean not null,
  effective_from timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'scheduled' check (status in ('scheduled', 'pending_confirmation', 'confirmed', 'reschedule_requested', 'rescheduled', 'cancelled_in_time', 'cancelled_late', 'completed', 'no_show', 'cancelled_by_provider')),
  policy_version integer not null references public.cancellation_policies (policy_version),
  cancellation_deadline_at timestamptz not null,
  business_timezone text not null check (business_timezone = 'America/Sao_Paulo'),
  cancellation_policy_snapshot jsonb not null check (jsonb_typeof(cancellation_policy_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index appointments_calendar_idx on public.appointments (starts_at, ends_at);
create index appointments_person_idx on public.appointments (person_id, starts_at desc);
create index appointment_status_history_appointment_idx on public.appointment_status_history (appointment_id, created_at desc);

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create policy appointments_manage_owner_secretary
on public.appointments
for all
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'))
with check (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy services_manage_owner_secretary
on public.services
for all
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'))
with check (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy cancellation_policies_read_staff
on public.cancellation_policies
for select
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy appointment_status_history_insert_staff
on public.appointment_status_history
for insert
to authenticated
with check (public.current_app_role() in ('psychologist_owner', 'secretary') and changed_by_user_id = auth.uid());

create policy appointment_status_history_select_staff
on public.appointment_status_history
for select
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'));

alter table public.services enable row level security;
alter table public.services force row level security;
alter table public.cancellation_policies enable row level security;
alter table public.cancellation_policies force row level security;
alter table public.appointments enable row level security;
alter table public.appointments force row level security;
alter table public.appointment_status_history enable row level security;
alter table public.appointment_status_history force row level security;

revoke all on public.services, public.cancellation_policies, public.appointments, public.appointment_status_history from anon;
grant select, insert, update, delete on public.services to authenticated;
grant select on public.cancellation_policies to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select, insert on public.appointment_status_history to authenticated;
