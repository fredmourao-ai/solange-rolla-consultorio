-- owners: forms
-- task-contract: docs/task-contracts/forms-staff-management.json
-- allow-static-routines: true
-- Staff-facing template management used by the operational forms UI.

create policy form_templates_staff_select
on public.form_templates
for select
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy form_templates_owner_insert
on public.form_templates
for insert
to authenticated
with check (public.current_app_role() = 'psychologist_owner');

create policy form_templates_owner_update
on public.form_templates
for update
to authenticated
using (public.current_app_role() = 'psychologist_owner')
with check (public.current_app_role() = 'psychologist_owner');

create policy form_templates_owner_delete
on public.form_templates
for delete
to authenticated
using (public.current_app_role() = 'psychologist_owner');

create policy form_template_versions_staff_select
on public.form_template_versions
for select
to authenticated
using (public.current_app_role() in ('psychologist_owner', 'secretary'));

create policy form_template_versions_owner_insert
on public.form_template_versions
for insert
to authenticated
with check (public.current_app_role() = 'psychologist_owner');

create policy form_template_versions_owner_update
on public.form_template_versions
for update
to authenticated
using (public.current_app_role() = 'psychologist_owner')
with check (public.current_app_role() = 'psychologist_owner');

create policy form_template_versions_owner_delete
on public.form_template_versions
for delete
to authenticated
using (public.current_app_role() = 'psychologist_owner');

grant select, insert, update, delete on public.form_templates to authenticated;
grant select, insert, update, delete on public.form_template_versions to authenticated;
