-- owners: appointments,audit,clinical
-- cross-module-task: docs/task-contracts/clinical-atomic-audit-200.json
-- allow-static-routines: true

create or replace function public.create_clinical_record(
  p_record_id uuid,
  p_appointment_id uuid,
  p_person_id uuid,
  p_author_user_id uuid,
  p_ciphertext text,
  p_iv text,
  p_auth_tag text,
  p_key_version integer,
  p_supersedes_id uuid default null
)
returns table (
  id uuid,
  appointment_id uuid,
  person_id uuid,
  author_user_id uuid,
  ciphertext text,
  iv text,
  auth_tag text,
  key_version integer,
  supersedes_id uuid,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public, clinical
as $$
begin
  if not public.has_permission('clinical.create')
    or public.current_app_role() <> 'psychologist_owner'
    or public.current_aal() <> 'aal2'
    or p_author_user_id <> auth.uid() then
    raise exception 'CLINICAL_PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.appointments as appointment
    where appointment.id = p_appointment_id
      and appointment.person_id = p_person_id
  ) then
    raise exception 'CLINICAL_APPOINTMENT_MISMATCH' using errcode = '23514';
  end if;

  if p_supersedes_id is not null then
    if not public.has_permission('clinical.supersede') then
      raise exception 'CLINICAL_SUPERSEDE_FORBIDDEN' using errcode = '42501';
    end if;
    if not exists (
      select 1
      from clinical.records as previous
      where previous.id = p_supersedes_id
        and previous.appointment_id = p_appointment_id
        and previous.person_id = p_person_id
    ) then
      raise exception 'CLINICAL_SUPERSEDE_MISMATCH' using errcode = '23514';
    end if;
  end if;

  return query
  insert into clinical.records (
    id, appointment_id, person_id, author_user_id,
    ciphertext, iv, auth_tag, key_version, supersedes_id
  ) values (
    p_record_id, p_appointment_id, p_person_id, p_author_user_id,
    p_ciphertext, p_iv, p_auth_tag, p_key_version, p_supersedes_id
  )
  returning clinical.records.id, clinical.records.appointment_id, clinical.records.person_id,
    clinical.records.author_user_id, clinical.records.ciphertext, clinical.records.iv,
    clinical.records.auth_tag, clinical.records.key_version, clinical.records.supersedes_id,
    clinical.records.created_at;

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    auth.uid(),
    'clinical_record.created',
    'clinical_record',
    p_record_id,
    p_record_id::text,
    jsonb_build_object(
      'appointmentId', p_appointment_id,
      'personId', p_person_id,
      'keyVersion', p_key_version
    )
  );
end;
$$;
