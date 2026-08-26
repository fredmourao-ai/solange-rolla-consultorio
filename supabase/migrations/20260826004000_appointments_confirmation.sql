-- owners: appointments,forms
-- cross-module-task: docs/task-contracts/appointment-confirmation.json
-- allow-static-routines: true

create table public.appointment_confirmations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete restrict,
  capability_id uuid references public.capabilities (id) on delete restrict,
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  response text check (response in ('confirmed', 'request_reschedule', 'cancelled')),
  unique (appointment_id, sent_at)
);

alter table public.appointment_confirmations enable row level security;
alter table public.appointment_confirmations force row level security;
create policy appointment_confirmations_staff on public.appointment_confirmations for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'secretary')) with check (public.current_app_role() in ('psychologist_owner', 'secretary'));
revoke all on public.appointment_confirmations from anon;
grant select, insert, update on public.appointment_confirmations to authenticated;
