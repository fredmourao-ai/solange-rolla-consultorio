begin;

select plan(4);

select ok(has_table_privilege('service_role', 'public.capabilities', 'INSERT'), 'service role can issue hashed capabilities');
select ok(not has_table_privilege('service_role', 'public.form_templates', 'INSERT'), 'staff template creation stays behind authenticated RLS');
select ok(not has_table_privilege('service_role', 'public.form_template_versions', 'INSERT'), 'staff template version creation stays behind authenticated RLS');
select ok(not has_table_privilege('service_role', 'public.form_submissions', 'INSERT'), 'staff submission creation stays behind authenticated RLS');

select * from finish();
rollback;
