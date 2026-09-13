-- owners: identity
-- task-contract: docs/task-contracts/identity-tasks-special-confirmation-type.json
-- allow-static-routines: true

-- Onda 4 Task 3 (handoff Secretaria -> Profissional) needs a task type for
-- "confirmação especial necessária" that doesn't fit the existing catalog.

alter table public.tasks drop constraint tasks_type_check;

alter table public.tasks add constraint tasks_type_check check (type in (
  'schedule_follow_up', 'contact_patient', 'resend_form',
  'collect_payment', 'review_document', 'special_confirmation', 'other_admin'
));
