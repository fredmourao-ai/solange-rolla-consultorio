-- owners: receivables
-- task-contract: docs/task-contracts/payments.json
-- allow-static-routines: true

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  paid_at timestamptz not null default now(),
  method text not null check (method in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'other')),
  external_reference text,
  idempotency_key text not null unique,
  actor_id uuid not null references auth.users (id) on delete restrict
);

create table public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  refunded_at timestamptz not null default now(),
  method text not null check (method in ('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'other')),
  reason text not null check (length(btrim(reason)) > 0),
  external_reference text,
  idempotency_key text not null unique,
  actor_id uuid not null references auth.users (id) on delete restrict
);

alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.payment_refunds enable row level security;
alter table public.payment_refunds force row level security;
create policy payments_owner_manage on public.payments for all to authenticated using (public.current_app_role() = 'psychologist_owner') with check (public.current_app_role() = 'psychologist_owner');
create policy refunds_owner_manage on public.payment_refunds for all to authenticated using (public.current_app_role() = 'psychologist_owner') with check (public.current_app_role() = 'psychologist_owner');
revoke all on public.payments, public.payment_refunds from anon;
grant select, insert on public.payments to authenticated;
grant select, insert on public.payment_refunds to authenticated;
