begin;

select plan(133);

select has_table('public', 'permission_definitions', 'permission definitions table exists');
select has_table('public', 'role_permission_defaults', 'role permission defaults table exists');
select has_table('public', 'user_permission_overrides', 'user permission overrides table exists');
select has_function('public', 'has_permission', array['text'], 'effective permission RPC exists');
select has_function('public', 'list_current_permissions', 'effective permission list RPC exists');

select ok((select relrowsecurity from pg_class where oid = 'public.permission_definitions'::regclass), 'permission definitions has RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.permission_definitions'::regclass), 'permission definitions forces RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.role_permission_defaults'::regclass), 'role defaults has RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.role_permission_defaults'::regclass), 'role defaults forces RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.user_permission_overrides'::regclass), 'user overrides has RLS enabled');
select ok((select relforcerowsecurity from pg_class where oid = 'public.user_permission_overrides'::regclass), 'user overrides forces RLS');

select ok((select prosecdef from pg_proc where oid = 'public.has_permission(text)'::regprocedure), 'has_permission is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.list_current_permissions()'::regprocedure), 'list_current_permissions is security definer');
select ok(
  (select proconfig is not null and array_to_string(proconfig, ',') like '%search_path=%'
   from pg_proc where oid = 'public.has_permission(text)'::regprocedure),
  'has_permission fixes search_path'
);
select ok(
  (select proconfig is not null and array_to_string(proconfig, ',') like '%search_path=%'
   from pg_proc where oid = 'public.list_current_permissions()'::regprocedure),
  'list_current_permissions fixes search_path'
);

select is((select count(*)::integer from public.permission_definitions), 46, 'catalog contains every Task 1 key');
select results_eq(
  $$ select permission_key from public.permission_definitions order by permission_key $$,
  $$ select permission_key from (values
    ('appointments.blocks.manage'), ('appointments.cancel'), ('appointments.checkin'),
    ('appointments.complete'), ('appointments.confirm'), ('appointments.create'),
    ('appointments.no_show'), ('appointments.read'), ('appointments.reschedule'),
    ('appointments.update'), ('audit.read'), ('clinical.attachments.manage'),
    ('clinical.create'), ('clinical.documents.manage'), ('clinical.read'),
    ('clinical.supersede'), ('documents.create'), ('documents.read'), ('documents.send'),
    ('events.manage'), ('events.read'), ('finance.adjust'), ('finance.read'),
    ('finance.receive'), ('finance.refund'), ('fiscal.cancel'), ('fiscal.issue'),
    ('fiscal.read'), ('forms.manage'), ('forms.read'), ('forms.send'),
    ('messaging.read'), ('messaging.send'), ('messaging.templates.manage'),
    ('patients.archive'), ('patients.create'), ('patients.read'),
    ('patients.relationships.manage'), ('patients.update'), ('permissions.manage'),
    ('reports.financial.read'), ('reports.fiscal.read'), ('reports.operational.read'),
    ('settings.manage'), ('users.manage'), ('users.read')
  ) as expected(permission_key) order by permission_key $$,
  'SQL catalog exactly matches Task 1'
);
select is((select count(*)::integer from public.permission_definitions where permission_key like 'tasks.%'), 0, 'future task permissions are absent');
select is(
  (select count(*)::integer from public.permission_definitions where clinical and requires_aal2),
  5,
  'all five clinical permissions are clinical and require AAL2'
);
select results_eq(
  $$ select permission_key from public.permission_definitions where requires_aal2 order by permission_key $$,
  $$ values
    ('audit.read'), ('clinical.attachments.manage'), ('clinical.create'),
    ('clinical.documents.manage'), ('clinical.read'), ('clinical.supersede'),
    ('finance.refund'), ('fiscal.cancel'), ('permissions.manage'), ('users.manage') $$,
  'AAL2 is required by the exact critical permission set'
);

select is((select count(*)::integer from public.role_permission_defaults), 138, 'every role has a default for every permission');
select is((select count(*)::integer from public.role_permission_defaults where role = 'psychologist_owner' and allowed), 46, 'owner defaults allow the full catalog');
select results_eq(
  $$ select permission_key from public.role_permission_defaults where role = 'secretary' and allowed order by permission_key $$,
  $$ values
    ('appointments.blocks.manage'), ('appointments.cancel'), ('appointments.checkin'),
    ('appointments.confirm'), ('appointments.create'), ('appointments.no_show'),
    ('appointments.read'), ('appointments.reschedule'), ('appointments.update'),
    ('documents.create'), ('documents.read'), ('documents.send'), ('events.manage'), ('events.read'),
    ('finance.read'), ('finance.receive'), ('fiscal.issue'), ('fiscal.read'),
    ('forms.read'), ('forms.send'), ('messaging.read'), ('messaging.send'),
    ('patients.create'), ('patients.read'), ('patients.relationships.manage'),
    ('patients.update'), ('reports.operational.read') $$,
  'secretary receives the exact operational defaults'
);
select results_eq(
  $$ select permission_key from public.role_permission_defaults where role = 'accounting' and allowed order by permission_key $$,
  $$ values
    ('documents.read'), ('finance.read'), ('fiscal.read'),
    ('reports.financial.read'), ('reports.fiscal.read') $$,
  'accounting receives only document and finance/fiscal read defaults'
);

select ok(not has_function_privilege('public', 'public.has_permission(text)', 'execute'), 'PUBLIC cannot execute has_permission');
select ok(not has_function_privilege('public', 'public.list_current_permissions()', 'execute'), 'PUBLIC cannot execute permission listing');
select ok(not has_function_privilege('anon', 'public.has_permission(text)', 'execute'), 'anonymous cannot execute has_permission');
select ok(not has_function_privilege('anon', 'public.list_current_permissions()', 'execute'), 'anonymous cannot execute permission listing');
select ok(has_function_privilege('authenticated', 'public.has_permission(text)', 'execute'), 'authenticated can execute has_permission');
select ok(has_function_privilege('authenticated', 'public.list_current_permissions()', 'execute'), 'authenticated can execute permission listing');
select ok(not has_table_privilege('anon', 'public.permission_definitions', 'select'), 'anonymous cannot read definitions');
select ok(not has_table_privilege('anon', 'public.role_permission_defaults', 'select'), 'anonymous cannot read role defaults');
select ok(not has_table_privilege('anon', 'public.user_permission_overrides', 'select'), 'anonymous cannot read user overrides');
select ok(has_table_privilege('authenticated', 'public.permission_definitions', 'select'), 'authenticated staff receive definition read grant');
select ok(has_table_privilege('authenticated', 'public.role_permission_defaults', 'select'), 'authenticated receives role-default grant constrained by RLS');
select ok(has_table_privilege('authenticated', 'public.user_permission_overrides', 'select'), 'authenticated receives override grant constrained by RLS');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('f2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'permission-owner@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('f2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'permission-secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('f2000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'permission-accounting@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('f2000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'permission-inactive@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('f2000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'permission-no-profile@example.test', 'synthetic-password', now(), '{}', '{}');

insert into public.profiles (user_id, role, display_name, active)
values
  ('f2000000-0000-4000-8000-000000000001', 'psychologist_owner', 'Owner de Permissões', true),
  ('f2000000-0000-4000-8000-000000000002', 'secretary', 'Secretaria de Permissões', true),
  ('f2000000-0000-4000-8000-000000000003', 'accounting', 'Contabilidade de Permissões', true),
  ('f2000000-0000-4000-8000-000000000004', 'psychologist_owner', 'Owner Inativa', false);

insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
values
  ('f2000000-0000-4000-8000-000000000002', 'patients.update', false, 'f2000000-0000-4000-8000-000000000001'),
  ('f2000000-0000-4000-8000-000000000002', 'reports.financial.read', true, 'f2000000-0000-4000-8000-000000000001'),
  ('f2000000-0000-4000-8000-000000000002', 'clinical.read', true, 'f2000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}', true);

select is(public.has_permission('patients.read'), true, 'secretary receives patients.read default');
select is(public.has_permission('clinical.read'), false, 'secretary can never receive clinical.read');
select is(public.has_permission('permission.that.does.not.exist'), false, 'unknown permission fails closed');
select is(public.has_permission(null), false, 'null permission fails closed');
select is(public.has_permission('patients.update'), false, 'explicit deny overrides secretary default allow');
select is(public.has_permission('reports.financial.read'), true, 'explicit allow overrides a non-clinical default deny');
select is(public.has_permission('clinical.read'), false, 'clinical allow override cannot bypass role eligibility');
select is((select count(*)::integer from public.list_current_permissions() where permission_key = 'patients.read'), 1, 'permission listing includes effective defaults');
select is((select count(*)::integer from public.list_current_permissions() where permission_key = 'patients.update'), 0, 'permission listing excludes explicit denies');
select is((select count(*)::integer from public.list_current_permissions() where permission_key = 'reports.financial.read'), 1, 'permission listing includes eligible explicit allows');
select is((select count(*)::integer from public.list_current_permissions() where permission_key = 'clinical.read'), 0, 'permission listing excludes structural clinical denies');

select is((select count(*)::integer from public.permission_definitions), 46, 'active staff can read definitions');
select is((select count(*)::integer from public.role_permission_defaults), 0, 'secretary cannot read role-default internals');
select is((select count(*)::integer from public.user_permission_overrides), 0, 'secretary cannot read override internals');
select throws_ok(
  $$ insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
     values ('f2000000-0000-4000-8000-000000000003', 'finance.read', false, 'f2000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'secretary cannot write overrides directly'
);
select throws_ok(
  $$ insert into public.permission_definitions (permission_key, area, label, sort_order)
     values ('test.secretary', 'test', 'Teste secretaria', 9001) $$,
  '42501',
  null,
  'secretary cannot write definitions directly'
);

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}', true);
select is(public.has_permission('finance.read'), true, 'accounting receives finance read default');
select is(public.has_permission('fiscal.read'), true, 'accounting receives fiscal read default');
select is(public.has_permission('reports.financial.read'), true, 'accounting receives financial report default');
select is(public.has_permission('documents.read'), true, 'accounting receives authorized document read default');
select is(public.has_permission('patients.read'), false, 'accounting does not receive patient read access');
select is(public.has_permission('appointments.read'), false, 'accounting does not receive agenda access');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000004","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission('patients.read'), false, 'inactive profile fails closed');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000005","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission('patients.read'), false, 'missing profile fails closed');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is(public.has_permission('patients.read'), true, 'owner at AAL1 retains non-critical permission');
select is(public.has_permission('clinical.read'), false, 'owner clinical permission requires AAL2');
select is(public.has_permission('finance.refund'), false, 'owner finance refund requires AAL2');
select is(public.has_permission('users.manage'), false, 'owner user management requires AAL2');
select throws_ok(
  $$ insert into public.permission_definitions (permission_key, area, label, sort_order)
     values ('test.owner_aal1', 'test', 'Teste owner AAL1', 9002) $$,
  '42501',
  null,
  'owner at AAL1 cannot write permission tables'
);

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission('clinical.read'), true, 'eligible owner at AAL2 receives clinical default');
select is(public.has_permission('finance.refund'), true, 'owner at AAL2 receives critical finance default');
select is(public.has_permission('users.manage'), true, 'owner at AAL2 receives critical administration default');
select is((select count(*)::integer from public.list_current_permissions() where permission_key = 'clinical.read'), 1, 'owner permission listing includes clinical access at AAL2');
select is((select count(*)::integer from public.role_permission_defaults), 138, 'owner at AAL2 can read role defaults');
select is((select count(*)::integer from public.user_permission_overrides), 3, 'owner at AAL2 can read overrides');
select throws_ok(
  $$ insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
     values ('f2000000-0000-4000-8000-000000000003', 'finance.read', false, 'f2000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'active owner at AAL2 cannot write an attributed override directly'
);
select throws_ok(
  $$ insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
     values ('f2000000-0000-4000-8000-000000000003', 'fiscal.read', false, 'f2000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'owner cannot spoof override attribution'
);


-- Task 2 exposes no interactive mutation path, including to an AAL2 owner.
select ok(not has_table_privilege('authenticated', 'public.' || table_name, privilege),
  'authenticated has no ' || privilege || ' grant on ' || table_name)
from (values ('permission_definitions'), ('role_permission_defaults'), ('user_permission_overrides')) as tables(table_name)
cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(privilege);
select is((select count(*)::integer from pg_policies
  where schemaname = 'public'
    and tablename in ('permission_definitions', 'role_permission_defaults', 'user_permission_overrides')
    and cmd <> 'SELECT'), 0, 'permission tables have only read policies');
select throws_ok($$ insert into public.permission_definitions (permission_key, area, label, sort_order) values ('test.owner', 'test', 'Synthetic', 9003) $$, '42501', null, 'owner AAL2 cannot insert permission_definitions');
select throws_ok($$ update public.permission_definitions set clinical = false, requires_aal2 = false where permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 cannot update permission_definitions');
select throws_ok($$ delete from public.permission_definitions where permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 cannot delete permission_definitions');
select throws_ok($$ insert into public.role_permission_defaults (role, permission_key, allowed) values ('secretary', 'clinical.read', true) $$, '42501', null, 'owner AAL2 cannot insert role_permission_defaults');
select throws_ok($$ update public.role_permission_defaults set allowed = true where role = 'secretary' and permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 cannot update role_permission_defaults');
select throws_ok($$ delete from public.role_permission_defaults where role = 'secretary' and permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 cannot delete role_permission_defaults');
select throws_ok($$ insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id) values ('f2000000-0000-4000-8000-000000000001', 'patients.read', true, 'f2000000-0000-4000-8000-000000000001') $$, '42501', null, 'owner AAL2 cannot insert user_permission_overrides');
select throws_ok($$ update public.user_permission_overrides set allowed = true where user_id = 'f2000000-0000-4000-8000-000000000001' and permission_key = 'permissions.manage' $$, '42501', null, 'owner AAL2 cannot update user_permission_overrides');
select throws_ok($$ delete from public.user_permission_overrides where user_id = 'f2000000-0000-4000-8000-000000000001' and permission_key = 'permissions.manage' $$, '42501', null, 'owner AAL2 cannot delete user_permission_overrides');

reset role;
insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
values ('f2000000-0000-4000-8000-000000000001', 'permissions.manage', false, 'f2000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.has_permission('permissions.manage'), false, 'owner management deny is effective');
select throws_ok($$ insert into public.permission_definitions (permission_key, area, label, sort_order) values ('test.owner', 'test', 'Synthetic', 9003) $$, '42501', null, 'owner AAL2 with management denied cannot insert permission_definitions');
select throws_ok($$ update public.permission_definitions set clinical = false, requires_aal2 = false where permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 with management denied cannot update permission_definitions');
select throws_ok($$ delete from public.permission_definitions where permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 with management denied cannot delete permission_definitions');
select throws_ok($$ insert into public.role_permission_defaults (role, permission_key, allowed) values ('secretary', 'clinical.read', true) $$, '42501', null, 'owner AAL2 with management denied cannot insert role_permission_defaults');
select throws_ok($$ update public.role_permission_defaults set allowed = true where role = 'secretary' and permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 with management denied cannot update role_permission_defaults');
select throws_ok($$ delete from public.role_permission_defaults where role = 'secretary' and permission_key = 'clinical.read' $$, '42501', null, 'owner AAL2 with management denied cannot delete role_permission_defaults');
select throws_ok($$ insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id) values ('f2000000-0000-4000-8000-000000000001', 'patients.read', true, 'f2000000-0000-4000-8000-000000000001') $$, '42501', null, 'owner AAL2 with management denied cannot insert user_permission_overrides');
select throws_ok($$ update public.user_permission_overrides set allowed = true where user_id = 'f2000000-0000-4000-8000-000000000001' and permission_key = 'permissions.manage' $$, '42501', null, 'owner AAL2 with management denied cannot update user_permission_overrides');
select throws_ok($$ delete from public.user_permission_overrides where user_id = 'f2000000-0000-4000-8000-000000000001' and permission_key = 'permissions.manage' $$, '42501', null, 'owner AAL2 with management denied cannot delete user_permission_overrides');

select is(public.has_permission('permissions.manage'), false, 'direct writes cannot restore owner management');
reset role;
-- Privileged synthetic setup: explicit allows for BOTH non-clinical roles.
insert into public.user_permission_overrides (user_id, permission_key, allowed, changed_by_user_id)
select profile.user_id, definition.permission_key, true, 'f2000000-0000-4000-8000-000000000001'::uuid
from public.profiles as profile cross join public.permission_definitions as definition
where profile.user_id in ('f2000000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000003')
  and definition.permission_key like 'clinical.%'
on conflict (user_id, permission_key) do update set allowed = true;
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission(permission_key), false, 'secretary AAL2 explicit allow denied: ' || permission_key)
from public.permission_definitions where permission_key like 'clinical.%';
select is((select count(*)::integer from public.list_current_permissions() where permission_key like 'clinical.%'), 0,
  'secretary AAL2 listing excludes all clinical allows');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission(permission_key), false, 'accounting AAL2 explicit allow denied: ' || permission_key)
from public.permission_definitions where permission_key like 'clinical.%';
select is((select count(*)::integer from public.list_current_permissions() where permission_key like 'clinical.%'), 0,
  'accounting AAL2 listing excludes all clinical allows');

reset role;
-- Misconfigured migration-owned metadata must not weaken the clinical prefix barrier.
update public.permission_definitions set clinical = false, requires_aal2 = false
where permission_key like 'clinical.%';
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission(permission_key), false, 'secretary AAL2 explicit allow denied despite false flags: ' || permission_key)
from public.permission_definitions where permission_key like 'clinical.%';
select is((select count(*)::integer from public.list_current_permissions() where permission_key like 'clinical.%'), 0,
  'secretary AAL2 listing excludes all clinical allows despite false flags');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission(permission_key), false, 'accounting AAL2 explicit allow denied despite false flags: ' || permission_key)
from public.permission_definitions where permission_key like 'clinical.%';
select is((select count(*)::integer from public.list_current_permissions() where permission_key like 'clinical.%'), 0,
  'accounting AAL2 listing excludes all clinical allows despite false flags');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}', true);
select is(public.has_permission('documents.create'), true, 'secretary can create administrative documents by default');
select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is(public.has_permission('clinical.read'), false, 'clinical prefix requires AAL2 even with false flags');

-- current_aal currently normalizes missing claims to aal1. Exercise a real NULL
-- helper result transactionally so this regression remains covered independently.
reset role;
create or replace function public.current_aal()
returns text language sql stable security definer set search_path = public, auth
as $$ select null::text $$;
set local role authenticated;
select is(public.current_aal(), null::text, 'NULL AAL regression setup returns NULL');
select is(public.has_permission('finance.refund'), false, 'requires_aal2 fails closed for NULL current_aal');
select is(public.has_permission('clinical.read'), false, 'clinical prefix fails closed for NULL current_aal');
select is((select count(*)::integer from public.list_current_permissions()
  where permission_key in ('finance.refund', 'clinical.read')), 0, 'listing excludes permissions requiring AAL2 when AAL is NULL');
reset role;
select * from finish();
rollback;
