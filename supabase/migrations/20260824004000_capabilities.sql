-- owners: forms
-- task-contract: docs/task-contracts/capabilities.json

create table public.capabilities (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  purpose text not null check (purpose in ('form_fill', 'appointment_confirm', 'appointment_cancel', 'appointment_reschedule')),
  subject_type text not null check (subject_type in ('appointment', 'form_submission')),
  subject_id uuid not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

alter table public.capabilities enable row level security;
alter table public.capabilities force row level security;
revoke all on public.capabilities from public, anon, authenticated;
