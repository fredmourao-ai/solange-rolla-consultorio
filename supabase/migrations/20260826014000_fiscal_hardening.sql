-- owners: fiscal
-- task-contract: docs/task-contracts/fiscal-hardening.json
-- allow-static-routines: true

comment on table public.fiscal_documents is 'Issued fiscal documents preserve identity, provider references and artifacts.';

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
    not (new.pdf_path = old.pdf_path or (new.pdf_path is null and old.pdf_path is null))
  ) then
    raise exception 'ISSUED_FISCAL_DOCUMENT_IMMUTABLE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
