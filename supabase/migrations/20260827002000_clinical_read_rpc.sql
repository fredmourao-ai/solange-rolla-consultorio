-- owners: audit,clinical
-- cross-module-task: docs/task-contracts/clinical-read-rpc.json
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
language sql
security invoker
set search_path = public, clinical
as $$
  insert into clinical.records (id, appointment_id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version, supersedes_id)
  values (p_record_id, p_appointment_id, p_person_id, p_author_user_id, p_ciphertext, p_iv, p_auth_tag, p_key_version, p_supersedes_id)
  returning clinical.records.id, clinical.records.appointment_id, clinical.records.person_id,
    clinical.records.author_user_id, clinical.records.ciphertext, clinical.records.iv,
    clinical.records.auth_tag, clinical.records.key_version, clinical.records.supersedes_id,
    clinical.records.created_at
$$;

create or replace function public.list_clinical_record_metadata(p_person_id uuid)
returns table (
  id uuid,
  appointment_id uuid,
  person_id uuid,
  created_at timestamptz,
  supersedes_id uuid
)
language sql
security invoker
set search_path = public, clinical
as $$
  select r.id, r.appointment_id, r.person_id, r.created_at, r.supersedes_id
  from clinical.records as r
  where r.person_id = p_person_id
  order by r.created_at desc
$$;

revoke all on function public.create_clinical_record(uuid, uuid, uuid, uuid, text, text, text, integer, uuid) from public, anon;
revoke all on function public.list_clinical_record_metadata(uuid) from public, anon;
grant execute on function public.create_clinical_record(uuid, uuid, uuid, uuid, text, text, text, integer, uuid) to authenticated;
grant execute on function public.list_clinical_record_metadata(uuid) to authenticated;

create or replace function public.get_clinical_record_envelope(record_id uuid)
returns table (
  id uuid,
  appointment_id uuid,
  person_id uuid,
  created_at timestamptz,
  supersedes_id uuid,
  ciphertext text,
  iv text,
  auth_tag text,
  key_version integer
)
language plpgsql
security invoker
set search_path = public, clinical
as $$
begin
  if public.current_app_role() = 'psychologist_owner'
    and public.current_aal() = 'aal2' then
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id, correlation_id, metadata)
    values (auth.uid(), 'clinical_record.viewed', 'clinical_record', record_id, record_id::text,
      jsonb_build_object('record_id', record_id));
    return query
      select r.id, r.appointment_id, r.person_id, r.created_at, r.supersedes_id,
        r.ciphertext, r.iv, r.auth_tag, r.key_version
      from clinical.records r
      where r.id = record_id;
  end if;
  return;
end
$$;

revoke all on function public.get_clinical_record_envelope(uuid) from public, anon;
grant execute on function public.get_clinical_record_envelope(uuid) to authenticated;
