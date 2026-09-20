-- owners: audit,forms
-- cross-module-task: docs/task-contracts/forms-capability-atomic-audit-212.json
-- allow-static-routines: true

create or replace function public.create_form_template_atomic(
  p_template_id uuid,
  p_version_id uuid,
  p_name text,
  p_classification text,
  p_schema jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  field_count integer;
begin
  if actor is null
    or public.current_app_role() <> 'psychologist_owner'
    or not public.has_permission('forms.manage') then
    raise exception 'FORM_TEMPLATE_CREATE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = ''
    or p_classification not in ('administrative','sensitive')
    or jsonb_typeof(p_schema) <> 'object'
    or jsonb_typeof(p_schema->'fields') <> 'array' then
    raise exception 'FORM_TEMPLATE_INPUT_INVALID' using errcode = '22023';
  end if;

  field_count := jsonb_array_length(p_schema->'fields');
  if field_count <= 0 then
    raise exception 'FORM_TEMPLATE_FIELDS_REQUIRED' using errcode = '22023';
  end if;

  insert into public.form_templates (id,name,active_version)
  values (p_template_id,btrim(p_name),1);

  insert into public.form_template_versions (
    id,template_id,version,data_classification,schema
  ) values (
    p_version_id,p_template_id,1,p_classification,p_schema
  );

  insert into public.audit_events (
    actor_user_id,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'form_template.created','form_template',p_template_id,p_template_id::text,
    jsonb_build_object(
      'templateVersionId',p_version_id,
      'classification',p_classification,
      'fieldCount',field_count
    )
  );

  return p_template_id;
end;
$$;

create or replace function public.issue_form_capability_atomic(
  p_submission_id uuid,
  p_person_id uuid,
  p_template_version_id uuid,
  p_capability_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  role_name text := public.current_app_role();
begin
  if actor is null
    or role_name not in ('psychologist_owner','secretary')
    or not public.has_permission('forms.send') then
    raise exception 'FORM_CAPABILITY_ISSUE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_submission_id is null or p_person_id is null or p_template_version_id is null
    or p_capability_id is null
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_expires_at is null or p_expires_at <= clock_timestamp() then
    raise exception 'FORM_CAPABILITY_INPUT_INVALID' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.form_template_versions where id=p_template_version_id
  ) then
    raise exception 'FORM_TEMPLATE_VERSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.form_submissions (
    id,subject_id,template_version_id,status
  ) values (
    p_submission_id,p_person_id,p_template_version_id,'draft'
  );

  insert into public.capabilities (
    id,token_hash,purpose,subject_type,subject_id,expires_at
  ) values (
    p_capability_id,p_token_hash,'form_fill','form_submission',p_submission_id,p_expires_at
  );

  insert into public.audit_events (
    actor_user_id,actor_kind,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'user','form.capability_issued','form_submission',p_submission_id,p_submission_id::text,
    jsonb_build_object(
      'personId',p_person_id,
      'templateVersionId',p_template_version_id,
      'expiresAt',p_expires_at
    )
  );

  return p_capability_id;
end;
$$;

revoke all on function public.create_form_template_atomic(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.create_form_template_atomic(uuid,uuid,text,text,jsonb) to authenticated;

revoke all on function public.issue_form_capability_atomic(uuid,uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.issue_form_capability_atomic(uuid,uuid,uuid,uuid,text,timestamptz) to authenticated;
