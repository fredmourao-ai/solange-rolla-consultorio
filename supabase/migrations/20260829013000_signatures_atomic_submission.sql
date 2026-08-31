-- owners: forms,signatures
-- cross-module-task: docs/task-contracts/signature-atomic.json
-- allow-static-routines: true

create or replace function public.sign_form_submission(
  p_submission_version_id uuid,
  p_declaration_version text,
  p_typed_name text,
  p_source text,
  p_canonical_hash_sha256 text,
  p_idempotency_key text
)
returns table(
  result_evidence_id uuid,
  result_submission_version_id uuid,
  result_declaration_version text,
  result_typed_name text,
  result_source text,
  result_canonical_hash_sha256 text,
  result_signed_at timestamptz,
  result_job_id uuid,
  result_idempotency_key text,
  result_signature_evidence_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_evidence_id uuid;
  existing_hash text;
  existing_submission_version_id uuid;
  parent_submission_id uuid;
  parent_status text;
  new_evidence_id uuid;
  new_job_id uuid;
  signed_at_value timestamptz;
begin
  if length(btrim(p_typed_name)) not between 1 and 160 then
    raise exception 'INVALID_TYPED_NAME';
  end if;
  if p_source not in ('patient_capability', 'staff') then
    raise exception 'SIGNATURE_SOURCE_INVALID';
  end if;
  if p_canonical_hash_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'SIGNATURE_HASH_INVALID';
  end if;
  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  existing_evidence_id := (
    select signature_evidence_id from public.document_jobs
    where idempotency_key = p_idempotency_key
  );
  if existing_evidence_id is not null then
    existing_hash := (
      select canonical_hash_sha256 from public.signature_evidence
      where id = existing_evidence_id
    );
    existing_submission_version_id := (
      select submission_version_id from public.signature_evidence
      where id = existing_evidence_id
    );
    if existing_hash <> p_canonical_hash_sha256
      or existing_submission_version_id <> p_submission_version_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return query select
      existing_evidence_id,
      existing_submission_version_id,
      (select declaration_version from public.signature_evidence where id = existing_evidence_id),
      (select typed_name from public.signature_evidence where id = existing_evidence_id),
      (select source from public.signature_evidence where id = existing_evidence_id),
      existing_hash,
      (select signed_at from public.signature_evidence where id = existing_evidence_id),
      (select id from public.document_jobs where idempotency_key = p_idempotency_key),
      p_idempotency_key,
      existing_evidence_id;
    return;
  end if;

  parent_submission_id := (
    select submission_id from public.form_submission_versions
    where id = p_submission_version_id
  );
  if parent_submission_id is null then
    raise exception 'FORM_SUBMISSION_VERSION_NOT_FOUND';
  end if;
  perform 1 from public.form_submissions
  where id = parent_submission_id for update;
  parent_status := (
    select status from public.form_submissions where id = parent_submission_id
  );
  if parent_status <> 'submitted' then
    raise exception 'FORM_SUBMISSION_NOT_SIGNABLE';
  end if;

  new_evidence_id := gen_random_uuid();
  new_job_id := gen_random_uuid();
  signed_at_value := clock_timestamp();

  begin
    insert into public.signature_evidence (
      id, submission_version_id, declaration_version, typed_name,
      signed_at, canonical_hash_sha256, source
    ) values (
      new_evidence_id, p_submission_version_id, p_declaration_version,
      btrim(p_typed_name), signed_at_value, p_canonical_hash_sha256, p_source
    );
    insert into public.document_jobs (
      id, idempotency_key, signature_evidence_id
    ) values (
      new_job_id, p_idempotency_key, new_evidence_id
    );
  exception when unique_violation then
    existing_evidence_id := (
      select signature_evidence_id from public.document_jobs
      where idempotency_key = p_idempotency_key
    );
    if existing_evidence_id is null then
      raise;
    end if;
    existing_hash := (
      select canonical_hash_sha256 from public.signature_evidence
      where id = existing_evidence_id
    );
    existing_submission_version_id := (
      select submission_version_id from public.signature_evidence
      where id = existing_evidence_id
    );
    if existing_hash <> p_canonical_hash_sha256
      or existing_submission_version_id <> p_submission_version_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return query select
      existing_evidence_id,
      existing_submission_version_id,
      (select declaration_version from public.signature_evidence where id = existing_evidence_id),
      (select typed_name from public.signature_evidence where id = existing_evidence_id),
      (select source from public.signature_evidence where id = existing_evidence_id),
      existing_hash,
      (select signed_at from public.signature_evidence where id = existing_evidence_id),
      (select id from public.document_jobs where idempotency_key = p_idempotency_key),
      p_idempotency_key,
      existing_evidence_id;
    return;
  end;

  update public.form_submissions set status = 'signed'
  where id = parent_submission_id;

  return query select
    new_evidence_id, p_submission_version_id, p_declaration_version,
    btrim(p_typed_name), p_source, p_canonical_hash_sha256,
    signed_at_value, new_job_id, p_idempotency_key, new_evidence_id;
end;
$$;

revoke all on function public.sign_form_submission(
  uuid, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.sign_form_submission(
  uuid, text, text, text, text, text
) to service_role;
