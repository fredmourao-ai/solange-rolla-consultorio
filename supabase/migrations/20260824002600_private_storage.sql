-- owners: platform
-- task-contract: docs/task-contracts/private-storage.json
-- allow-static-routines: true

insert into storage.buckets (id, name, public)
values
  ('signed-documents-private', 'signed-documents-private', false),
  ('fiscal-documents-private', 'fiscal-documents-private', false),
  ('financial-receipts-private', 'financial-receipts-private', false),
  ('clinical-private', 'clinical-private', false)
on conflict (id) do nothing;

create policy private_storage_insert_authenticated
on storage.objects
for insert
to authenticated
with check (
  bucket_id in (
    'signed-documents-private',
    'fiscal-documents-private',
    'financial-receipts-private',
    'clinical-private'
  )
);

create policy private_storage_select_nonclinical
on storage.objects
for select
to authenticated
using (
  bucket_id in (
    'signed-documents-private',
    'fiscal-documents-private',
    'financial-receipts-private'
  )
);

create policy private_storage_select_clinical_owner_aal2
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clinical-private'
  and public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);
