-- owners: clinical
-- task-contract: docs/task-contracts/clinical-records.json
-- allow-static-routines: true

create schema clinical;

create table clinical.records (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  person_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null check (key_version > 0),
  supersedes_id uuid,
  created_at timestamptz not null default now()
);

alter table clinical.records enable row level security;
alter table clinical.records force row level security;

create policy clinical_records_owner_aal2 on clinical.records
  for all to authenticated
  using (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2')
  with check (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2');

revoke all on clinical.records from anon;
grant select, insert on clinical.records to authenticated;
