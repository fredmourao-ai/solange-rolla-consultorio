-- owners: forms
-- task-contract: docs/task-contracts/forms-staff-management-service-role.json

-- Capability tokens remain hidden from browser clients; the protected server action
-- authorizes the staff session before issuing the hashed one-time capability.
grant insert on public.capabilities to service_role;
