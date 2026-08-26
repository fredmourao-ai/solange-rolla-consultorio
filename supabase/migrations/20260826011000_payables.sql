-- owners: payables
-- task-contract: docs/task-contracts/payables.json
-- allow-static-routines: true

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(btrim(legal_name)) > 0),
  document_normalized text,
  created_at timestamptz not null default now()
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  description text not null check (length(btrim(description)) > 0),
  amount_cents bigint not null check (amount_cents > 0),
  start_date date not null,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  month_end_fallback text not null default 'last_day' check (month_end_fallback in ('last_day', 'reject')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  recurrence_rule_id uuid references public.recurrence_rules (id) on delete restrict,
  description text not null check (length(btrim(description)) > 0),
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  competence date not null,
  receipt_path text,
  idempotency_key text not null unique,
  paid_cents bigint not null default 0 check (paid_cents >= 0 and paid_cents <= amount_cents),
  status text not null default 'open' check (status in ('open', 'partial', 'paid', 'voided')),
  created_at timestamptz not null default now()
);

create table public.payable_payments (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references public.payables (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  paid_at timestamptz not null default now(),
  method text not null,
  receipt_path text,
  idempotency_key text not null unique,
  actor_id uuid not null references auth.users (id) on delete restrict
);

insert into public.expense_categories (name) values
  ('aluguel'), ('condomínio'), ('energia'), ('internet'), ('telefone'), ('contabilidade'),
  ('impostos'), ('CRP'), ('cursos/formação'), ('supervisão'), ('marketing'), ('software'),
  ('material'), ('manutenção'), ('outras')
on conflict (name) do nothing;

alter table public.vendors enable row level security;
alter table public.vendors force row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_categories force row level security;
alter table public.recurrence_rules enable row level security;
alter table public.recurrence_rules force row level security;
alter table public.payables enable row level security;
alter table public.payables force row level security;
alter table public.payable_payments enable row level security;
alter table public.payable_payments force row level security;

create policy payables_accounting on public.vendors for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'accounting')) with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy categories_accounting on public.expense_categories for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'accounting')) with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy recurrence_accounting on public.recurrence_rules for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'accounting')) with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy payables_accounting on public.payables for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'accounting')) with check (public.current_app_role() in ('psychologist_owner', 'accounting'));
create policy payable_payments_accounting on public.payable_payments for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'accounting')) with check (public.current_app_role() in ('psychologist_owner', 'accounting'));

revoke all on public.vendors, public.expense_categories, public.recurrence_rules, public.payables, public.payable_payments from anon;
grant select, insert, update on public.vendors, public.expense_categories, public.recurrence_rules, public.payables, public.payable_payments to authenticated;
