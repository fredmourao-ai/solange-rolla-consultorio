-- owners: appointments,forms
-- cross-module-task: docs/task-contracts/cancellation-legal-binding.json
-- allow-static-routines: true

alter table public.cancellation_policies
  add column legal_document_version_id uuid references public.legal_document_versions (id) on delete restrict;

create index cancellation_policies_legal_version_idx on public.cancellation_policies (legal_document_version_id);

create or replace function public.validate_cancellation_policy_legal_version()
returns trigger language plpgsql as $$
begin
  if new.legal_document_version_id is null then raise exception 'cancellation policies require a legal document version'; end if;
  if not exists (select 1 from public.legal_document_versions where public.legal_document_versions.id = new.legal_document_version_id and public.legal_document_versions.document_id in (select public.legal_documents.id from public.legal_documents where public.legal_documents.key = 'cancellation_policy')) then
    raise exception 'cancellation policy must reference cancellation legal copy';
  end if;
  return new;
end;
$$;

create trigger cancellation_policies_require_legal_version
before insert or update on public.cancellation_policies
for each row execute function public.validate_cancellation_policy_legal_version();
