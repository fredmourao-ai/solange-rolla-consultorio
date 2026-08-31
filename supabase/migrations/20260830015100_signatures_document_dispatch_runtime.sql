-- owners: signatures
-- task-contract: docs/task-contracts/signed-document-dispatch-runtime.json
-- allow-static-routines: true

create or replace function public.claim_document_jobs(p_limit integer default 10)
returns table(result_id uuid, result_idempotency_key text)
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.document_jobs j
  set status = 'processing',
      attempts = j.attempts + 1,
      last_error_code = null
  where j.id in (
    select q.id
    from public.document_jobs q
    where q.dispatched_at is null
      and q.status in ('queued', 'processing', 'failed_retryable')
    order by q.created_at, q.id
    for update skip locked
    limit greatest(0, least(coalesce(p_limit, 10), 100))
  )
  returning j.id, j.idempotency_key;
$$;

revoke all on function public.claim_document_jobs(integer) from public;
revoke all on function public.claim_document_jobs(integer) from anon;
revoke all on function public.claim_document_jobs(integer) from authenticated;
grant execute on function public.claim_document_jobs(integer) to service_role;
