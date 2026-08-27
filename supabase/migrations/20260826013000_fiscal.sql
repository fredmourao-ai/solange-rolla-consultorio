-- owners: fiscal,people
-- cross-module-task: docs/task-contracts/fiscal.json
-- allow-static-routines: true

create table public.fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  version integer not null check (version > 0),
  issuer_kind text not null check (issuer_kind in ('individual', 'company')),
  issuer_document text not null check (length(btrim(issuer_document)) > 0),
  municipality_code text not null check (length(btrim(municipality_code)) > 0),
  service_code text not null check (length(btrim(service_code)) > 0),
  tax_regime text not null check (length(btrim(tax_regime)) > 0),
  fiscal_address jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null,
  effective_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from),
  unique (issuer_document, version)
);

create table public.fiscal_treatments (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('appointment_completed', 'appointment_late_cancellation', 'appointment_no_show', 'event_registration', 'other_service')),
  version integer not null check (version > 0),
  issuance_rule text not null check (issuance_rule in ('service_completed', 'payment_received', 'manual_review', 'not_issuable')),
  service_code text,
  enabled_for_live boolean not null default false,
  approved boolean not null default false,
  effective_from timestamptz not null,
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  check (service_code is null or length(btrim(service_code)) > 0),
  check (effective_until is null or effective_until > effective_from),
  unique (source_kind, version)
);

create table public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('appointment_completed', 'appointment_late_cancellation', 'appointment_no_show', 'event_registration', 'other_service')),
  source_id uuid not null,
  person_id uuid not null references public.people(id) on delete restrict,
  payer_person_id uuid not null references public.people(id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 0),
  profile_id uuid not null references public.fiscal_profiles(id) on delete restrict,
  profile_version integer not null check (profile_version > 0),
  treatment_id uuid not null references public.fiscal_treatments(id) on delete restrict,
  treatment_version integer not null check (treatment_version > 0),
  provider text not null check (length(btrim(provider)) > 0),
  idempotency_key text not null check (length(btrim(idempotency_key)) > 0),
  external_id text,
  protocol text,
  status text not null default 'not_ready' check (status in ('not_ready', 'ready', 'queued', 'processing', 'issued', 'failed_retryable', 'failed_final', 'cancel_requested', 'cancelled', 'replaced')),
  issued_at timestamptz,
  cancelled_at timestamptz,
  xml_path text,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  unique (provider, external_id)
);

create table public.fiscal_attempts (
  id uuid primary key default gen_random_uuid(),
  fiscal_document_id uuid not null references public.fiscal_documents(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  operation text not null check (operation in ('issue', 'status', 'cancel')),
  status text not null check (status in ('started', 'succeeded', 'retryable_failure', 'final_failure')),
  provider_status text,
  error_code text,
  correlation_id uuid not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (fiscal_document_id, operation, attempt_number)
);

create or replace function public.fiscal_documents_guard()
returns trigger language plpgsql as $$
begin
  if old.status = 'issued' and (
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
    not (new.idempotency_key = old.idempotency_key or (new.idempotency_key is null and old.idempotency_key is null))
  ) then
    raise exception 'ISSUED_FISCAL_DOCUMENT_IMMUTABLE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger fiscal_documents_guard_before_update
before update on public.fiscal_documents
for each row execute function public.fiscal_documents_guard();

alter table public.fiscal_profiles enable row level security;
alter table public.fiscal_profiles force row level security;
alter table public.fiscal_treatments enable row level security;
alter table public.fiscal_treatments force row level security;
alter table public.fiscal_documents enable row level security;
alter table public.fiscal_documents force row level security;
alter table public.fiscal_attempts enable row level security;
alter table public.fiscal_attempts force row level security;

create policy fiscal_profiles_accounting on public.fiscal_profiles for all to authenticated
using (public.current_app_role() in ('psychologist_owner', 'accounting'))
with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy fiscal_treatments_accounting on public.fiscal_treatments for all to authenticated
using (public.current_app_role() in ('psychologist_owner', 'accounting'))
with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy fiscal_documents_accounting on public.fiscal_documents for all to authenticated
using (public.current_app_role() in ('psychologist_owner', 'accounting'))
with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy fiscal_attempts_accounting on public.fiscal_attempts for all to authenticated
using (public.current_app_role() in ('psychologist_owner', 'accounting'))
with check (public.current_app_role() in ('psychologist_owner', 'accounting'));

revoke all on public.fiscal_profiles, public.fiscal_treatments, public.fiscal_documents, public.fiscal_attempts from anon;
grant select, insert, update on public.fiscal_profiles, public.fiscal_treatments, public.fiscal_documents, public.fiscal_attempts to authenticated;

insert into public.fiscal_treatments (source_kind, version, issuance_rule, enabled_for_live, approved, effective_from)
values
  ('appointment_completed', 1, 'manual_review', false, false, '2026-01-01T00:00:00Z'),
  ('appointment_late_cancellation', 1, 'manual_review', false, false, '2026-01-01T00:00:00Z'),
  ('appointment_no_show', 1, 'manual_review', false, false, '2026-01-01T00:00:00Z'),
  ('event_registration', 1, 'manual_review', false, false, '2026-01-01T00:00:00Z'),
  ('other_service', 1, 'not_issuable', false, false, '2026-01-01T00:00:00Z');
