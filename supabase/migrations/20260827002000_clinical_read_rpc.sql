-- owners: audit,clinical
-- cross-module-task: docs/task-contracts/clinical-read-rpc.json
-- allow-static-routines: true

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
