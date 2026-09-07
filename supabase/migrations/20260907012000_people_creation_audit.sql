-- owners: audit,people
-- cross-module-task: docs/task-contracts/person-creation-audit.json
-- allow-static-routines: true

create or replace function public.create_person_with_audit(
  p_id uuid,
  p_civil_name text,
  p_preferred_name text,
  p_cpf_normalized text,
  p_birth_date date,
  p_email_normalized text,
  p_phone_e164 text,
  p_preferred_channel text,
  p_birthday_messages_enabled boolean,
  p_fiscal_address jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.current_app_role() not in ('psychologist_owner', 'secretary') then
    raise exception 'PERSON_FORBIDDEN';
  end if;
  insert into public.people (
    id, civil_name, preferred_name, cpf_normalized, birth_date, email_normalized,
    phone_e164, preferred_channel, birthday_messages_enabled, fiscal_address
  ) values (
    p_id, btrim(p_civil_name), nullif(btrim(p_preferred_name), ''), p_cpf_normalized,
    p_birth_date, p_email_normalized, p_phone_e164, p_preferred_channel,
    p_birthday_messages_enabled, coalesce(p_fiscal_address, '{}'::jsonb)
  );

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    auth.uid(), 'person.created', 'person', p_id, p_id::text,
    jsonb_build_object('fiscalReady', coalesce(p_fiscal_address, '{}'::jsonb) <> '{}'::jsonb)
  );

  return p_id;
end;
$$;

revoke all on function public.create_person_with_audit(uuid, text, text, text, date, text, text, text, boolean, jsonb) from public, anon;
grant execute on function public.create_person_with_audit(uuid, text, text, text, date, text, text, text, boolean, jsonb) to authenticated;
