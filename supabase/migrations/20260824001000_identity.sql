-- owners: identity
-- task-contract: docs/task-contracts/identity-profiles.json
-- allow-static-routines: true

create type public.app_role as enum ('psychologist_owner', 'secretary', 'accounting');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete restrict,
  role public.app_role not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Staff profile and role assignment; authorization is enforced by RLS.';
comment on column public.profiles.role is 'Application role, independent from Supabase Auth identity.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.role
  from public.profiles as p
  where p.user_id = auth.uid()
    and p.active
  limit 1
$$;

create or replace function public.current_aal()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1')
$$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_select_self_or_owner
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or (public.current_app_role() = 'psychologist_owner' and public.current_aal() = 'aal2')
);

create policy profiles_insert_owner_aal2
on public.profiles
for insert
to authenticated
with check (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);

create policy profiles_update_owner_aal2
on public.profiles
for update
to authenticated
using (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
)
with check (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);

create policy profiles_delete_owner_aal2
on public.profiles
for delete
to authenticated
using (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);

revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.current_aal() from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_aal() to authenticated;
