-- owners: fiscal
-- task-contract: docs/task-contracts/fiscal-artifacts.json
-- allow-static-routines: true

alter table public.fiscal_documents
  add column xml_sha256 text,
  add column xml_byte_length bigint,
  add column pdf_sha256 text,
  add column pdf_byte_length bigint;

alter table public.fiscal_documents
  add constraint fiscal_documents_xml_sha256_format
    check (xml_sha256 is null or xml_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint fiscal_documents_pdf_sha256_format
    check (pdf_sha256 is null or pdf_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint fiscal_documents_artifact_lengths_nonnegative
    check ((xml_byte_length is null or xml_byte_length >= 0) and (pdf_byte_length is null or pdf_byte_length >= 0));

create table public.fiscal_cancellation_events (
  id uuid primary key default gen_random_uuid(),
  fiscal_document_id uuid not null references public.fiscal_documents(id) on delete restrict,
  idempotency_key text not null,
  reason text not null check (length(btrim(reason)) > 0),
  requested_by uuid not null references auth.users(id) on delete restrict,
  provider_protocol text,
  substitute_document_id uuid references public.fiscal_documents(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested', 'processing', 'cancelled', 'failed_retryable', 'failed_final')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (idempotency_key)
);

alter table public.fiscal_cancellation_events enable row level security;
alter table public.fiscal_cancellation_events force row level security;

create policy fiscal_cancellation_events_accounting on public.fiscal_cancellation_events
  for all to authenticated
  using (public.current_app_role() in ('psychologist_owner', 'accounting'))
  with check (public.current_app_role() in ('psychologist_owner', 'accounting'));

revoke all on public.fiscal_cancellation_events from anon;
grant select, insert, update on public.fiscal_cancellation_events to authenticated;

create or replace function public.fiscal_documents_guard()
returns trigger language plpgsql as $$
begin
  if old.status = 'issued' and (
    new.status not in ('issued', 'cancel_requested', 'replaced') or
    not (new.source_type = old.source_type or (new.source_type is null and old.source_type is null)) or
    not (new.source_id = old.source_id or (new.source_id is null and old.source_id is null)) or
    not (new.person_id = old.person_id or (new.person_id is null and old.person_id is null)) or
    not (new.payer_person_id = old.payer_person_id or (new.payer_person_id is null and old.payer_person_id is null)) or
    not (new.amount_cents = old.amount_cents or (new.amount_cents is null and old.amount_cents is null)) or
    not (new.profile_id = old.profile_id or (new.profile_id is null and old.profile_id is null)) or
    not (new.profile_version = old.profile_version or (new.profile_version is null and old.profile_version is null)) or
    not (new.treatment_id = old.treatment_id or (new.treatment_id is null and old.treatment_id is null)) or
    not (new.treatment_version = old.treatment_version or (new.treatment_version is null and old.treatment_version is null)) or
    not (new.provider = old.provider or (new.provider is null and old.provider is null)) or
    not (new.idempotency_key = old.idempotency_key or (new.idempotency_key is null and old.idempotency_key is null)) or
    not (new.external_id = old.external_id or (new.external_id is null and old.external_id is null)) or
    not (new.protocol = old.protocol or (new.protocol is null and old.protocol is null)) or
    not (new.issued_at = old.issued_at or (new.issued_at is null and old.issued_at is null)) or
    not (new.xml_path = old.xml_path or (new.xml_path is null and old.xml_path is null)) or
    not (new.xml_sha256 = old.xml_sha256 or (new.xml_sha256 is null and old.xml_sha256 is null)) or
    not (new.xml_byte_length = old.xml_byte_length or (new.xml_byte_length is null and old.xml_byte_length is null)) or
    not (new.pdf_path = old.pdf_path or (new.pdf_path is null and old.pdf_path is null)) or
    not (new.pdf_sha256 = old.pdf_sha256 or (new.pdf_sha256 is null and old.pdf_sha256 is null)) or
    not (new.pdf_byte_length = old.pdf_byte_length or (new.pdf_byte_length is null and old.pdf_byte_length is null))
  ) then
    raise exception 'ISSUED_FISCAL_DOCUMENT_IMMUTABLE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
