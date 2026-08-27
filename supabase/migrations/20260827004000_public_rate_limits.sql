-- owners: platform
-- task-contract: docs/task-contracts/public-edge-security.json
-- allow-static-routines: true

create table public.public_rate_limits (
  rate_key text primary key check (length(rate_key) = 64),
  scope text not null check (scope in ('capability_exchange', 'public_form_save', 'appointment_response', 'signature_submit', 'webhook_invalid_signature')),
  request_count integer not null check (request_count >= 0),
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at > window_started_at)
);

alter table public.public_rate_limits enable row level security;
alter table public.public_rate_limits force row level security;
revoke all on public.public_rate_limits from public, anon, authenticated;

create or replace function public.consume_public_rate_limit(
  p_rate_key text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.public_rate_limits%rowtype;
  now_value timestamptz := clock_timestamp();
begin
  if p_rate_key !~ '^[a-f0-9]{64}$'
    or p_scope not in ('capability_exchange', 'public_form_save', 'appointment_response', 'signature_submit', 'webhook_invalid_signature')
    or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'RATE_LIMIT_CONFIG_INVALID' using errcode = '22023';
  end if;

  insert into public.public_rate_limits(rate_key, scope, request_count, window_started_at, expires_at)
  values (p_rate_key, p_scope, 1, now_value, now_value + make_interval(secs => p_window_seconds))
  on conflict (rate_key) do update
    set scope = excluded.scope,
        request_count = case
          when public.public_rate_limits.expires_at <= now_value then 1
          when public.public_rate_limits.request_count < p_limit then public.public_rate_limits.request_count + 1
          else public.public_rate_limits.request_count
        end,
        window_started_at = case
          when public.public_rate_limits.expires_at <= now_value then now_value
          else public.public_rate_limits.window_started_at
        end,
        expires_at = case
          when public.public_rate_limits.expires_at <= now_value then now_value + make_interval(secs => p_window_seconds)
          else public.public_rate_limits.expires_at
        end
  returning request_count, expires_at into current_row;

  if current_row.request_count <= p_limit then
    return query select true, p_limit - current_row.request_count, 0;
  else
    return query select false, 0, greatest(1, ceil(extract(epoch from (current_row.expires_at - now_value)))::integer);
  end if;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer) to service_role;
