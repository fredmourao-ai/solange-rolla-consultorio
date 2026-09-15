-- owners: people
-- task-contract: docs/task-contracts/people-emergency-contact.json

alter table public.people
  add column emergency_contact_name text,
  add column emergency_contact_phone_e164 text,
  add column emergency_contact_relationship text,
  add constraint people_emergency_contact_name_length
    check (emergency_contact_name is null or length(btrim(emergency_contact_name)) between 1 and 200),
  add constraint people_emergency_contact_phone_format
    check (emergency_contact_phone_e164 is null or emergency_contact_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint people_emergency_contact_relationship_length
    check (emergency_contact_relationship is null or length(btrim(emergency_contact_relationship)) between 1 and 80),
  add constraint people_emergency_contact_complete
    check (
      (emergency_contact_name is null and emergency_contact_phone_e164 is null and emergency_contact_relationship is null)
      or
      (emergency_contact_name is not null and emergency_contact_phone_e164 is not null)
    );
