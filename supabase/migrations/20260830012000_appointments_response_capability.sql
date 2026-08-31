-- owners: forms
-- task-contract: docs/task-contracts/appointment-response-capability.json

alter table public.capabilities
  drop constraint capabilities_purpose_check;

alter table public.capabilities
  add constraint capabilities_purpose_check
  check (purpose in (
    'form_fill',
    'appointment_confirm',
    'appointment_cancel',
    'appointment_reschedule',
    'appointment_response'
  ));
