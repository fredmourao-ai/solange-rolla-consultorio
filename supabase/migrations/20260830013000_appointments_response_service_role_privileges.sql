-- owners: appointments, people
-- cross-module-task: docs/task-contracts/appointment-response-service-role-privileges.json

grant select, update on public.appointments to service_role;
grant select on public.people to service_role;
grant select on public.services to service_role;
grant insert on public.appointment_confirmations to service_role;
