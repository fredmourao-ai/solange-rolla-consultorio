-- owners: forms,signatures
-- cross-module-task: docs/task-contracts/public-intake-service-role-privileges.json

grant select, update on public.capabilities to service_role;
grant select on public.form_submissions to service_role;
grant select on public.form_template_versions to service_role;
grant select on public.form_submission_versions to service_role;
grant select on public.legal_documents to service_role;
grant select on public.legal_document_versions to service_role;
grant insert on public.legal_acceptances to service_role;
grant select on public.document_jobs to service_role;
grant select on public.signature_evidence to service_role;
