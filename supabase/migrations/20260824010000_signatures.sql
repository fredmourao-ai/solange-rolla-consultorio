-- owners: forms,signatures
-- cross-module-task: docs/task-contracts/signatures.json
-- allow-static-routines: true

create table public.signature_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_version_id uuid not null references public.form_submission_versions (id) on delete restrict,
  declaration_version text not null,
  typed_name text not null check (length(btrim(typed_name)) between 1 and 160),
  signature_asset_path text,
  signed_at timestamptz not null default now(),
  canonical_hash_sha256 text not null check (canonical_hash_sha256 ~ '^[a-f0-9]{64}$'),
  source text not null check (source in ('patient_capability', 'staff')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  document_status text not null default 'queued' check (document_status in ('queued', 'processing', 'ready', 'failed'))
);

create table public.document_jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  signature_evidence_id uuid not null references public.signature_evidence (id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create policy signature_evidence_owner_read
on public.signature_evidence
for select
to authenticated
using (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2');

create policy signature_evidence_owner_insert
on public.signature_evidence
for insert
to authenticated
with check (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2');

create policy document_jobs_owner
on public.document_jobs
for all
to authenticated
using (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2')
with check (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2');

alter table public.signature_evidence enable row level security;
alter table public.signature_evidence force row level security;
alter table public.document_jobs enable row level security;
alter table public.document_jobs force row level security;

revoke all on public.signature_evidence, public.document_jobs from anon;
grant select, insert on public.signature_evidence to authenticated;
grant select, insert, update on public.document_jobs to authenticated;
