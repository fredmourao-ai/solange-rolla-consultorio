-- owners: appointments
-- task-contract: docs/task-contracts/appointments-operational-states-113.json

alter table public.appointments
  drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in (
    'scheduled',
    'pending_confirmation',
    'confirmed',
    'checked_in',
    'in_progress',
    'reschedule_requested',
    'rescheduled',
    'cancelled_in_time',
    'cancelled_late',
    'completed',
    'no_show',
    'cancelled_by_provider'
  ));
