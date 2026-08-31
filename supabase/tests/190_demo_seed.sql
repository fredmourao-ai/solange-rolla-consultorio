begin;

select plan(8);

select is((select count(*) from public.profiles where display_name = 'Demonstração Local' and role = 'psychologist_owner'), 1::bigint,
  'demo seed has local owner profile');
select is((select count(*) from public.people where civil_name like '%Demonstração%'), 3::bigint,
  'demo seed has three synthetic people');
select is((select count(*) from public.cancellation_policies where policy_version = 1), 1::bigint,
  'demo seed has cancellation policy v1');
select is((select count(*) from public.appointments where id::text like 'd1000000-%'), 3::bigint,
  'demo seed has three appointments');
select is((select count(*) from public.receivables where id::text like 'd2000000-%'), 3::bigint,
  'demo seed has receivables');
select is((select count(*) from public.events where id::text like 'd3000000-%'), 1::bigint,
  'demo seed has one event');
select is((select count(*) from public.fiscal_documents where id::text like 'd4000000-%'), 2::bigint,
  'demo seed has two fiscal documents');
select ok(not exists (
  select 1 from public.people where civil_name like '%Demonstração%'
    and (cpf_normalized is not null or phone_e164 is not null or email_normalized is not null)
), 'demo people contain no real contact identifiers');

select * from finish();
rollback;
