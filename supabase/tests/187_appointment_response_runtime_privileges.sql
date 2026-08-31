begin;
select plan(5);

select ok(has_table_privilege('service_role','public.appointments','select'), 'service role can read bound appointment');
select ok(has_table_privilege('service_role','public.appointments','update'), 'service role can update bound appointment');
select ok(has_table_privilege('service_role','public.people','select'), 'service role can read appointment person');
select ok(has_table_privilege('service_role','public.services','select'), 'service role can read appointment service');
select ok(has_table_privilege('service_role','public.appointment_confirmations','insert'), 'service role can record confirmation response');

select * from finish();
rollback;
