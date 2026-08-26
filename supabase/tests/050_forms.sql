begin;

select plan(6);

select has_table('public', 'form_templates', 'form templates table exists');
select has_table('public', 'form_template_versions', 'form template versions table exists');
select has_table('public', 'form_submissions', 'form submissions table exists');
select has_table('public', 'form_submission_versions', 'form submission versions table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.form_submissions'::regclass), 'form submissions has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.form_submission_versions'::regclass), 'form versions have RLS enabled');

select * from finish();
rollback;
