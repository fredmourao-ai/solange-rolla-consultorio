-- owners: forms,people
-- cross-module-task: docs/task-contracts/legal-terms.json
-- allow-static-routines: true

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('service_terms', 'cancellation_policy', 'truthfulness_declaration', 'privacy_notice')),
  created_at timestamptz not null default now()
);

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents (id) on delete restrict,
  version integer not null check (version > 0),
  content text not null check (length(content) > 0),
  content_hash_sha256 text not null check (content_hash_sha256 ~ '^[a-f0-9]{64}$'),
  effective_from timestamptz not null,
  supersedes_id uuid references public.legal_document_versions (id) on delete restrict,
  is_draft boolean not null default true,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete restrict,
  document_version_id uuid not null references public.legal_document_versions (id) on delete restrict,
  content_hash_sha256 text not null check (content_hash_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz not null default now(),
  channel text not null check (channel in ('web', 'staff', 'capability')),
  capability_id uuid,
  unique (person_id, document_version_id)
);

create or replace function public.prevent_accepted_legal_version_mutation()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.legal_acceptances where document_version_id = coalesce(old.id, new.id)) then
    raise exception 'accepted legal document versions are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger legal_document_versions_immutable_after_acceptance
before update or delete on public.legal_document_versions
for each row execute function public.prevent_accepted_legal_version_mutation();

create policy legal_documents_owner_manage
on public.legal_documents for all to authenticated
using (public.current_app_role() = 'psychologist_owner')
with check (public.current_app_role() = 'psychologist_owner');

create policy legal_versions_owner_manage
on public.legal_document_versions for all to authenticated
using (public.current_app_role() = 'psychologist_owner')
with check (public.current_app_role() = 'psychologist_owner');

create policy legal_acceptances_staff_status
on public.legal_acceptances for select to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy legal_acceptances_owner_insert
on public.legal_acceptances for insert to authenticated
with check (public.current_app_role() = 'psychologist_owner');

alter table public.legal_documents enable row level security;
alter table public.legal_documents force row level security;
alter table public.legal_document_versions enable row level security;
alter table public.legal_document_versions force row level security;
alter table public.legal_acceptances enable row level security;
alter table public.legal_acceptances force row level security;

revoke all on public.legal_documents, public.legal_document_versions, public.legal_acceptances from anon;
grant select, insert, update on public.legal_documents to authenticated;
grant select, insert, update on public.legal_document_versions to authenticated;
grant select, insert on public.legal_acceptances to authenticated;
