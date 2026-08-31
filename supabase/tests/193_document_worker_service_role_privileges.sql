begin;

select plan(4);

select ok(has_table_privilege('service_role', 'public.form_templates', 'SELECT'), 'document worker can read form template names');
select ok(not has_table_privilege('service_role', 'public.form_templates', 'INSERT'), 'document worker cannot insert form templates');
select ok(not has_table_privilege('service_role', 'public.form_templates', 'UPDATE'), 'document worker cannot update form templates');
select ok(not has_table_privilege('service_role', 'public.form_templates', 'DELETE'), 'document worker cannot delete form templates');

select * from finish();
rollback;
