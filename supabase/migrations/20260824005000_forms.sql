-- owners: forms
-- task-contract: docs/task-contracts/forms.json
-- allow-static-routines: true

create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active_version integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.form_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates (id) on delete restrict,
  version integer not null check (version > 0),
  data_classification text not null check (data_classification in ('administrative', 'sensitive')),
  schema jsonb not null check (jsonb_typeof(schema) = 'object'),
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  template_version_id uuid not null references public.form_template_versions (id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'signed', 'superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions (id) on delete restrict,
  version integer not null check (version > 0),
  answers jsonb,
  answers_ciphertext text,
  answers_iv text,
  answers_auth_tag text,
  key_version integer,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (submission_id, version),
  check (
    (answers_ciphertext is null and answers_iv is null and answers_auth_tag is null and key_version is null)
    or (answers_ciphertext is not null and answers_iv is not null and answers_auth_tag is not null and key_version is not null)
  )
);

create trigger form_submissions_set_updated_at
before update on public.form_submissions
for each row execute function public.set_updated_at();

create or replace function public.prevent_signed_submission_version_mutation()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.form_submissions
    where id = coalesce(old.submission_id, new.submission_id)
      and status = 'signed'
  ) then
    raise exception 'signed form submissions are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger form_submission_versions_immutable_when_signed
before update or delete on public.form_submission_versions
for each row execute function public.prevent_signed_submission_version_mutation();

create policy forms_manage_owner_secretary
on public.form_submissions
for all
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'))
with check (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy form_versions_manage_owner
on public.form_submission_versions
for all
to authenticated
using (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2')
with check (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2');

alter table public.form_templates enable row level security;
alter table public.form_templates force row level security;
alter table public.form_template_versions enable row level security;
alter table public.form_template_versions force row level security;
alter table public.form_submissions enable row level security;
alter table public.form_submissions force row level security;
alter table public.form_submission_versions enable row level security;
alter table public.form_submission_versions force row level security;

revoke all on public.form_templates, public.form_template_versions, public.form_submissions, public.form_submission_versions from anon;
grant select, insert, update on public.form_submissions to authenticated;
grant select, insert, update, delete on public.form_submission_versions to authenticated;
