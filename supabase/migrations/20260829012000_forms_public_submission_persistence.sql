-- owners: forms
-- task-contract: docs/task-contracts/form-submission-persistence.json
-- allow-static-routines: true

create or replace function public.persist_form_submission(
  p_submission_id uuid,
  p_template_version_id uuid,
  p_status text,
  p_answers jsonb default null,
  p_answers_ciphertext text default null,
  p_answers_iv text default null,
  p_answers_auth_tag text default null,
  p_key_version integer default null
)
returns table(
  result_id uuid,
  result_submission_id uuid,
  result_version integer,
  result_submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_template_version_id uuid;
  current_status text;
  classification_value text;
  target_version_value integer;
begin
  if p_status not in ('draft', 'submitted') then
    raise exception 'FORM_SUBMISSION_STATUS_INVALID';
  end if;

  perform 1
  from public.form_submissions
  where form_submissions.id = p_submission_id
  for update;
  if not found then
    raise exception 'FORM_SUBMISSION_NOT_FOUND';
  end if;

  current_template_version_id := (
    select template_version_id from public.form_submissions
    where form_submissions.id = p_submission_id
  );
  current_status := (
    select status from public.form_submissions
    where form_submissions.id = p_submission_id
  );
  if current_template_version_id <> p_template_version_id then
    raise exception 'FORM_TEMPLATE_VERSION_MISMATCH';
  end if;
  if current_status <> 'draft' then
    raise exception 'FORM_SUBMISSION_NOT_EDITABLE';
  end if;

  classification_value := (
    select data_classification from public.form_template_versions
    where form_template_versions.id = p_template_version_id
  );
  if classification_value = 'sensitive' then
    if p_answers is not null or p_answers_ciphertext is null
      or p_answers_iv is null or p_answers_auth_tag is null
      or p_key_version is null then
      raise exception 'FORM_SENSITIVE_ENVELOPE_REQUIRED';
    end if;
  elsif classification_value = 'administrative' then
    if p_answers is null or p_answers_ciphertext is not null
      or p_answers_iv is not null or p_answers_auth_tag is not null
      or p_key_version is not null then
      raise exception 'FORM_ADMINISTRATIVE_PLAINTEXT_REQUIRED';
    end if;
  else
    raise exception 'FORM_CLASSIFICATION_INVALID';
  end if;

  target_version_value := coalesce((
    select max(form_submission_versions.version)
    from public.form_submission_versions
    where form_submission_versions.submission_id = p_submission_id
  ), 1);

  insert into public.form_submission_versions (
    submission_id, version, answers, answers_ciphertext,
    answers_iv, answers_auth_tag, key_version, submitted_at
  ) values (
    p_submission_id, target_version_value, p_answers, p_answers_ciphertext,
    p_answers_iv, p_answers_auth_tag, p_key_version,
    case when p_status = 'submitted' then clock_timestamp() else null end
  )
  on conflict (submission_id, version) do update set
    answers = excluded.answers,
    answers_ciphertext = excluded.answers_ciphertext,
    answers_iv = excluded.answers_iv,
    answers_auth_tag = excluded.answers_auth_tag,
    key_version = excluded.key_version,
    submitted_at = excluded.submitted_at;

  update public.form_submissions
  set status = p_status
  where form_submissions.id = p_submission_id;

  return query
  select
    form_submission_versions.id,
    form_submission_versions.submission_id,
    form_submission_versions.version,
    form_submission_versions.submitted_at
  from public.form_submission_versions
  where form_submission_versions.submission_id = p_submission_id
    and form_submission_versions.version = target_version_value;
end;
$$;

revoke all on function public.persist_form_submission(
  uuid, uuid, text, jsonb, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.persist_form_submission(
  uuid, uuid, text, jsonb, text, text, text, integer
) to service_role;
