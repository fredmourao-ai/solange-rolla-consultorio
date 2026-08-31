-- owners: platform
-- task-contract: docs/task-contracts/public-action-nonces.json

create table public.public_action_nonces (
  nonce_hash text primary key check (nonce_hash ~ '^[a-f0-9]{64}$'),
  consumed_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  check (expires_at > consumed_at)
);

create index public_action_nonces_expires_at_idx
  on public.public_action_nonces (expires_at);

alter table public.public_action_nonces enable row level security;
alter table public.public_action_nonces force row level security;

revoke all on public.public_action_nonces from public, anon, authenticated;
grant select, insert, delete on public.public_action_nonces to service_role;
