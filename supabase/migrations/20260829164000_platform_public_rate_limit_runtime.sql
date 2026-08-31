-- owners: platform
-- task-contract: docs/task-contracts/public-rate-limit-runtime.json
-- allow-static-routines: true

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
  current_count integer;
  current_expires_at timestamptz;
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
          else least(public.public_rate_limits.request_count + 1, p_limit + 1)
        end,
        window_started_at = case
          when public.public_rate_limits.expires_at <= now_value then now_value
          else public.public_rate_limits.window_started_at
        end,
        expires_at = case
          when public.public_rate_limits.expires_at <= now_value then now_value + make_interval(secs => p_window_seconds)
          else public.public_rate_limits.expires_at
        end
;

  current_count := (
    select request_count from public.public_rate_limits where rate_key = p_rate_key
  );
  current_expires_at := (
    select expires_at from public.public_rate_limits where rate_key = p_rate_key
  );

  if current_count <= p_limit then
    allowed := true;
    remaining := greatest(0, p_limit - current_count);
    retry_after_seconds := 0;
  else
    allowed := false;
    remaining := 0;
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (current_expires_at - now_value)))::integer
    );
  end if;
  return next;
end;
$$;
revoke all on function public.consume_public_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer)
  to service_role;
