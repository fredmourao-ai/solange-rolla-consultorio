-- owners: audit,people
-- cross-module-task: docs/task-contracts/people-audited-updates.json
-- allow-static-routines: true

create or replace function public.audit_person_updated()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  identity_changed boolean := old.civil_name <> new.civil_name
    or old.birth_date <> new.birth_date
    or coalesce(old.preferred_name <> new.preferred_name, false) or ((old.preferred_name is null) <> (new.preferred_name is null))
    or coalesce(old.cpf_normalized <> new.cpf_normalized, false) or ((old.cpf_normalized is null) <> (new.cpf_normalized is null));
  contact_changed boolean := coalesce(old.email_normalized <> new.email_normalized, false) or ((old.email_normalized is null) <> (new.email_normalized is null))
    or coalesce(old.phone_e164 <> new.phone_e164, false) or ((old.phone_e164 is null) <> (new.phone_e164 is null));
  preferences_changed boolean := old.preferred_channel <> new.preferred_channel
    or old.birthday_messages_enabled <> new.birthday_messages_enabled;
  emergency_changed boolean := coalesce(old.emergency_contact_name <> new.emergency_contact_name, false) or ((old.emergency_contact_name is null) <> (new.emergency_contact_name is null))
    or coalesce(old.emergency_contact_phone_e164 <> new.emergency_contact_phone_e164, false) or ((old.emergency_contact_phone_e164 is null) <> (new.emergency_contact_phone_e164 is null))
    or coalesce(old.emergency_contact_relationship <> new.emergency_contact_relationship, false) or ((old.emergency_contact_relationship is null) <> (new.emergency_contact_relationship is null));
  fiscal_changed boolean := coalesce(old.fiscal_address <> new.fiscal_address, false) or ((old.fiscal_address is null) <> (new.fiscal_address is null));
begin
  if auth.uid() is null or not (identity_changed or contact_changed or preferences_changed or emergency_changed or fiscal_changed) then
    return new;
  end if;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, correlation_id, metadata)
  values (
    auth.uid(), 'person.updated', 'person', new.id, new.id::text,
    jsonb_build_object(
      'identityChanged', identity_changed,
      'contactChanged', contact_changed,
      'preferencesChanged', preferences_changed,
      'emergencyContactChanged', emergency_changed,
      'fiscalChanged', fiscal_changed
    )
  );
  return new;
end;
$$;

create trigger people_audit_updated
after update on public.people
for each row execute function public.audit_person_updated();
