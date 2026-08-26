-- owners: people
-- task-contract: docs/task-contracts/people-registry.json
-- allow-static-routines: true

create table public.people (
  id uuid primary key default gen_random_uuid(),
  civil_name text not null check (length(btrim(civil_name)) between 1 and 200),
  preferred_name text,
  cpf_normalized text unique check (cpf_normalized is null or cpf_normalized ~ '^[0-9]{11}$'),
  birth_date date not null,
  email_normalized text unique check (email_normalized is null or email_normalized = lower(email_normalized)),
  phone_e164 text unique check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  preferred_channel text not null default 'none' check (preferred_channel in ('whatsapp', 'email', 'phone', 'none')),
  birthday_messages_enabled boolean not null default false,
  fiscal_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.person_relationships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete restrict,
  related_person_id uuid not null references public.people (id) on delete restrict,
  relationship_kind text not null check (relationship_kind in ('legal_guardian', 'financial_responsible', 'fiscal_taker')),
  created_at timestamptz not null default now(),
  unique (person_id, related_person_id, relationship_kind),
  check (person_id <> related_person_id)
);

create trigger people_set_updated_at
before update on public.people
for each row execute function public.set_updated_at();

create view public.accounting_people_view
with (security_barrier = true)
as
  select id, civil_name, cpf_normalized, fiscal_address
  from public.people;

alter table public.people enable row level security;
alter table public.people force row level security;
alter table public.person_relationships enable row level security;
alter table public.person_relationships force row level security;

create policy people_admin_select
on public.people
for select
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy people_admin_insert
on public.people
for insert
to authenticated
with check (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy people_admin_update
on public.people
for update
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'))
with check (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy people_admin_delete
on public.people
for delete
to authenticated
using (public.current_app_role() = 'psychologist_owner');

create policy relationships_admin_all
on public.person_relationships
for all
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'))
with check (public.current_app_role() in ('psychologist_owner', 'secretary'));

revoke all on public.people, public.person_relationships from anon;
grant select, insert, update on public.people to authenticated;
grant delete on public.people to authenticated;
grant select, insert, update, delete on public.person_relationships to authenticated;
revoke all on public.accounting_people_view from anon;
grant select on public.accounting_people_view to authenticated;
