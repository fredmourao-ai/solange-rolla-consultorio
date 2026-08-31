-- owners: forms
-- task-contract: docs/task-contracts/capability-exchange-runtime.json
-- allow-static-routines: true

create or replace function public.exchange_capability(
  p_token_hash text,
  p_purpose text,
  p_now timestamptz default clock_timestamp()
)
returns table(id uuid, purpose text, subject_type text, subject_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.capabilities as c
  set used_at = p_now
  where c.token_hash = p_token_hash
    and c.purpose = p_purpose
    and c.revoked_at is null
    and c.used_at is null
    and c.expires_at > p_now
  returning c.id, c.purpose, c.subject_type, c.subject_id, c.expires_at;
end;
$$;

revoke all on function public.exchange_capability(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.exchange_capability(text, text, timestamptz) to service_role;
