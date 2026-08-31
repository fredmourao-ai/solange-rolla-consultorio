-- owners: signatures
-- task-contract: docs/task-contracts/signed-document-result-atomic.json
-- allow-static-routines: true

create or replace function public.persist_document_job_result(
  p_job_id uuid,
  p_evidence_id uuid,
  p_result_status text,
  p_error_code text,
  p_storage_path text,
  p_sha256 text,
  p_byte_length bigint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_result_status not in ('ready', 'failed_retryable', 'failed_final') then
    raise exception 'DOCUMENT_RESULT_STATUS_INVALID';
  end if;
  if not exists (
    select 1 from public.document_jobs
    where id = p_job_id and signature_evidence_id = p_evidence_id
  ) then
    raise exception 'DOCUMENT_JOB_EVIDENCE_MISMATCH';
  end if;
  if p_result_status = 'ready' and (
    p_storage_path is null or p_sha256 !~ '^[a-f0-9]{64}$' or p_byte_length is null or p_byte_length < 0
  ) then
    raise exception 'DOCUMENT_ARTIFACT_INVALID';
  end if;

  update public.document_jobs
  set status = case when p_result_status = 'ready' then 'completed' else p_result_status end,
      last_error_code = case when p_result_status = 'ready' then null else left(coalesce(p_error_code, 'DOCUMENT_FAILED'), 100) end,
      completed_at = case when p_result_status in ('ready', 'failed_final') then clock_timestamp() else null end
  where id = p_job_id;

  update public.signature_evidence
  set document_status = p_result_status,
      document_storage_path = case when p_result_status = 'ready' then p_storage_path else null end,
      document_sha256 = case when p_result_status = 'ready' then p_sha256 else null end,
      document_byte_length = case when p_result_status = 'ready' then p_byte_length else null end
  where id = p_evidence_id;
end;
$$;

revoke all on function public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint) from public;
revoke all on function public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint) from anon;
revoke all on function public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint) from authenticated;
grant execute on function public.persist_document_job_result(uuid,uuid,text,text,text,text,bigint) to service_role;
