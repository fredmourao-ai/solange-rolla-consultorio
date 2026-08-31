-- owners: signatures
-- task-contract: docs/task-contracts/signed-document-delivery.json

alter table public.document_jobs
  add column kind text not null default 'signed-form.pdf',
  add column dispatched_at timestamptz,
  add column attempts integer not null default 0 check (attempts >= 0),
  add column last_error_code text check (last_error_code is null or length(last_error_code) <= 100),
  add column completed_at timestamptz;

alter table public.document_jobs
  drop constraint document_jobs_status_check;

alter table public.document_jobs
  add constraint document_jobs_status_check
  check (status in ('queued', 'processing', 'completed', 'failed', 'failed_retryable', 'failed_final'));

alter table public.document_jobs
  add constraint document_jobs_kind_check
  check (kind = 'signed-form.pdf');

alter table public.signature_evidence
  add column document_storage_path text,
  add column document_sha256 text check (document_sha256 is null or document_sha256 ~ '^[a-f0-9]{64}$'),
  add column document_byte_length bigint check (document_byte_length is null or document_byte_length >= 0);

alter table public.signature_evidence
  drop constraint signature_evidence_document_status_check;

alter table public.signature_evidence
  add constraint signature_evidence_document_status_check
  check (document_status in ('queued', 'processing', 'ready', 'failed', 'failed_retryable', 'failed_final'));

grant select, update on public.document_jobs to service_role;
grant select, update on public.signature_evidence to service_role;
