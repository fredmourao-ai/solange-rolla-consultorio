-- owners: people,receivables
-- cross-module-task: docs/task-contracts/receivables.json
-- allow-static-routines: true

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  person_id uuid not null references public.people (id) on delete restrict,
  payer_person_id uuid not null references public.people (id) on delete restrict,
  original_amount_cents bigint not null check (original_amount_cents >= 0),
  idempotency_key text not null unique,
  status text not null default 'open' check (status in ('open', 'partial', 'paid', 'overdue', 'refund_due', 'refunded', 'voided')),
  created_at timestamptz not null default now()
);

create table public.receivable_adjustments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables (id) on delete restrict,
  adjustment_cents bigint not null,
  reason text not null check (length(btrim(reason)) > 0),
  actor_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.receivables enable row level security;
alter table public.receivables force row level security;
alter table public.receivable_adjustments enable row level security;
alter table public.receivable_adjustments force row level security;
create policy receivables_staff on public.receivables for all to authenticated using (public.current_app_role() in ('psychologist_owner', 'secretary')) with check (public.current_app_role() in ('psychologist_owner', 'secretary'));
create policy receivable_adjustments_owner on public.receivable_adjustments for all to authenticated using (public.current_app_role() = 'psychologist_owner') with check (public.current_app_role() = 'psychologist_owner');
revoke all on public.receivables, public.receivable_adjustments from anon;
grant select, insert, update on public.receivables to authenticated;
grant select, insert on public.receivable_adjustments to authenticated;
