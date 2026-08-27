-- owners: clinical
-- task-contract: docs/task-contracts/clinical-attachments.json
-- allow-static-routines: true

create table clinical.attachments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references clinical.records(id) on delete restrict,
  object_path text not null check (object_path like 'clinical/%'),
  media_type text not null check (media_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (object_path)
);

create or replace function clinical.reject_clinical_record_mutation()
returns trigger
language plpgsql
set search_path = clinical
as $$
begin
  raise exception 'CLINICAL_RECORD_IMMUTABLE';
end;
$$;

create trigger clinical_records_immutable_update
before update on clinical.records
for each row execute function clinical.reject_clinical_record_mutation();

alter table clinical.attachments enable row level security;
alter table clinical.attachments force row level security;

create policy clinical_attachments_owner_aal2 on clinical.attachments
  for all to authenticated
  using (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2')
  with check (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2');

revoke all on clinical.attachments from anon;
grant select, insert on clinical.attachments to authenticated;
