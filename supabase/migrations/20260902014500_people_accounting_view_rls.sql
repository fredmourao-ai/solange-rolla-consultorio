-- owners: people
-- task-contract: docs/task-contracts/accounting-people-view-rls.json
-- allow-static-routines: true

create or replace function public.accounting_people_rows()
returns table (
  id uuid,
  civil_name text,
  cpf_normalized text,
  fiscal_address jsonb
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id, p.civil_name, p.cpf_normalized, p.fiscal_address
  from public.people as p
  where public.current_app_role() = 'accounting'
$$;

revoke all on function public.accounting_people_rows() from public, anon;
grant execute on function public.accounting_people_rows() to authenticated;

create or replace view public.accounting_people_view
with (security_barrier = true, security_invoker = true)
as
  select id, civil_name, cpf_normalized, fiscal_address
  from public.accounting_people_rows();

revoke all on public.accounting_people_view from anon;
grant select on public.accounting_people_view to authenticated;
