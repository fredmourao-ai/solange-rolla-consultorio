-- owners: forms
-- task-contract: docs/task-contracts/capability-exchange.json
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
  update public.capabilities
  set used_at = p_now
  where token_hash = p_token_hash
    and purpose = p_purpose
    and revoked_at is null
    and used_at is null
    and expires_at > p_now
  returning capabilities.id, capabilities.purpose, capabilities.subject_type, capabilities.subject_id, capabilities.expires_at;
end;
$$;

revoke all on function public.exchange_capability(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.exchange_capability(text, text, timestamptz) to service_role;
