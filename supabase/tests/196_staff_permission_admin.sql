begin;

select plan(42);

select has_function('public', 'list_staff_users', 'staff list RPC exists');
select has_function('public', 'list_user_access', array['uuid'], 'user access RPC exists');
select has_function('public', 'set_user_permission_override', array['uuid','text','boolean'], 'permission set RPC exists');
select has_function('public', 'clear_user_permission_override', array['uuid','text'], 'permission clear RPC exists');
select has_function('public', 'upsert_staff_profile', array['uuid','text','app_role','boolean'], 'staff profile RPC exists');
select ok((select prosecdef from pg_proc where oid='public.list_staff_users()'::regprocedure), 'staff list RPC is security definer');
select ok((select prosecdef from pg_proc where oid='public.list_user_access(uuid)'::regprocedure), 'access list RPC is security definer');
select ok((select prosecdef from pg_proc where oid='public.set_user_permission_override(uuid,text,boolean)'::regprocedure), 'permission set RPC is security definer');
select ok((select prosrc like '%pg_advisory_xact_lock%' from pg_proc where oid='public.set_user_permission_override(uuid,text,boolean)'::regprocedure), 'permission mutation serializes administrative invariant changes');
select ok((select prosrc like '%pg_advisory_xact_lock%' from pg_proc where oid='public.upsert_staff_profile(uuid,text,app_role,boolean)'::regprocedure), 'profile mutation serializes administrative invariant changes');
select ok(not has_function_privilege('public','public.set_user_permission_override(uuid,text,boolean)','execute'), 'PUBLIC cannot mutate permissions');
select ok(not has_function_privilege('anon','public.set_user_permission_override(uuid,text,boolean)','execute'), 'anon cannot mutate permissions');
select ok(has_function_privilege('authenticated','public.set_user_permission_override(uuid,text,boolean)','execute'), 'authenticated may call guarded permission RPC');
select ok(not has_table_privilege('authenticated','public.profiles','INSERT'), 'authenticated cannot insert profiles directly');
select ok(not has_table_privilege('authenticated','public.profiles','UPDATE'), 'authenticated cannot update profiles directly');
select ok(not has_table_privilege('authenticated','public.profiles','DELETE'), 'authenticated cannot delete profiles directly');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
 ('f3000000-0000-4000-8000-000000000001','authenticated','authenticated','admin-owner@example.test','synthetic',now(),'{}','{}'),
 ('f3000000-0000-4000-8000-000000000002','authenticated','authenticated','backup-owner@example.test','synthetic',now(),'{}','{}'),
 ('f3000000-0000-4000-8000-000000000003','authenticated','authenticated','secretary-admin@example.test','synthetic',now(),'{}','{}'),
 ('f3000000-0000-4000-8000-000000000004','authenticated','authenticated','accounting-admin@example.test','synthetic',now(),'{}','{}'),
 ('f3000000-0000-4000-8000-000000000005','authenticated','authenticated','invited-staff@example.test','synthetic',now(),'{}','{}');

insert into public.profiles (user_id,role,display_name,active)
values
 ('f3000000-0000-4000-8000-000000000001','psychologist_owner','Owner Principal',true),
 ('f3000000-0000-4000-8000-000000000002','psychologist_owner','Owner Reserva',true),
 ('f3000000-0000-4000-8000-000000000003','secretary','Secretaria',true),
 ('f3000000-0000-4000-8000-000000000004','accounting','Contabilidade',true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$ select * from public.list_staff_users() $$,'42501','PERMISSION_FORBIDDEN','secretary cannot list all staff by default');
select throws_ok($$ select * from public.list_user_access('f3000000-0000-4000-8000-000000000003') $$,'42501','PERMISSION_FORBIDDEN','secretary cannot inspect permission matrix by default');
select throws_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','patients.read',false) $$,'42501','PERMISSION_FORBIDDEN','secretary cannot change permissions by default');

select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select is((select count(*)::integer from public.list_staff_users()),4,'owner may list staff at AAL1 via users.read');
select throws_ok($$ select * from public.list_user_access('f3000000-0000-4000-8000-000000000003') $$,'42501','PERMISSION_FORBIDDEN','permission matrix requires AAL2');

select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is((select count(*)::integer from public.list_user_access('f3000000-0000-4000-8000-000000000003')),46,'owner AAL2 sees complete permission catalog');
select is((select email from public.list_staff_users() where user_id='f3000000-0000-4000-8000-000000000003'), 'secretary-admin@example.test','staff list exposes administrative email only to authorized caller');

select lives_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','patients.update',false) $$,'owner can set explicit deny');
select is((select override_allowed from public.list_user_access('f3000000-0000-4000-8000-000000000003') where permission_key='patients.update'),false,'explicit deny is stored');
select is((select effective_allowed from public.list_user_access('f3000000-0000-4000-8000-000000000003') where permission_key='patients.update'),false,'explicit deny becomes effective');
select is((select count(*)::integer from public.audit_events where action='staff_permission.override_set' and entity_id='f3000000-0000-4000-8000-000000000003'),1,'permission change writes audit event');
select ok((select metadata::text not like '%@example.test%' from public.audit_events where action='staff_permission.override_set' and entity_id='f3000000-0000-4000-8000-000000000003' limit 1),'permission audit excludes email/secrets');
select lives_ok($$ select public.clear_user_permission_override('f3000000-0000-4000-8000-000000000003','patients.update') $$,'owner can clear override');
select is((select override_allowed from public.list_user_access('f3000000-0000-4000-8000-000000000003') where permission_key='patients.update'),null::boolean,'clearing restores inherited state');
select is((select effective_allowed from public.list_user_access('f3000000-0000-4000-8000-000000000003') where permission_key='patients.update'),true,'clearing restores secretary default');
select throws_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','clinical.read',true) $$,'42501','CLINICAL_ROLE_REQUIRED','non-clinical role cannot receive clinical permission');
select throws_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','not.real',true) $$,'22023','UNKNOWN_PERMISSION','unknown permission is rejected');

select lives_ok($$ select public.upsert_staff_profile('f3000000-0000-4000-8000-000000000005','Nova Secretaria','secretary',true) $$,'authorized owner creates profile for invited auth user');
select is((select role::text from public.profiles where user_id='f3000000-0000-4000-8000-000000000005'),'secretary','created profile has selected role');
select is((select count(*)::integer from public.audit_events where action='staff_profile.created' and entity_id='f3000000-0000-4000-8000-000000000005'),1,'staff creation is audited');

select lives_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','users.manage',true) $$,'owner may explicitly grant non-clinical user management');
select lives_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','permissions.manage',true) $$,'owner may delegate permission administration');
select lives_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000004','reports.financial.read',false) $$,'owner may deny an accounting default before delegated admin test');

select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000003','reports.financial.read',true) $$,'42501','CANNOT_GRANT_UNHELD_PERMISSION','delegated admin cannot grant a permission she does not hold');
select throws_ok($$ select public.clear_user_permission_override('f3000000-0000-4000-8000-000000000004','reports.financial.read') $$,'42501','CANNOT_GRANT_UNHELD_PERMISSION','delegated admin cannot clear a deny when it would grant an unheld default');
select throws_ok($$ select public.upsert_staff_profile('f3000000-0000-4000-8000-000000000004','Contabilidade','psychologist_owner',true) $$,'42501','OWNER_ROLE_MANAGEMENT_FORBIDDEN','non-owner administrator cannot promote clinical owner');
select throws_ok($$ select public.upsert_staff_profile('f3000000-0000-4000-8000-000000000001','Owner Principal','secretary',true) $$,'42501','OWNER_ROLE_MANAGEMENT_FORBIDDEN','non-owner administrator cannot demote an owner');
select throws_ok($$ select public.upsert_staff_profile('f3000000-0000-4000-8000-000000000005','Nova Contabilidade','accounting',true) $$,'42501','CANNOT_ASSIGN_ROLE_WITH_UNHELD_PERMISSION','delegated admin cannot assign a role whose defaults exceed her own access');

select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select lives_ok($$ select public.upsert_staff_profile('f3000000-0000-4000-8000-000000000002','Owner Reserva','psychologist_owner',false) $$,'owner may deactivate another owner while one owner remains');

select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000001','permissions.manage',false) $$,'23514','LAST_ACCESS_ADMIN_REQUIRED','delegated admin cannot remove permission administration from the last active owner');
reset role;
delete from public.user_permission_overrides where user_id='f3000000-0000-4000-8000-000000000001' and permission_key='permissions.manage';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f3000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$ select public.upsert_staff_profile('f3000000-0000-4000-8000-000000000001','Owner Principal','psychologist_owner',false) $$,'23514','LAST_OWNER_REQUIRED','last active owner cannot be deactivated');
select throws_ok($$ select public.set_user_permission_override('f3000000-0000-4000-8000-000000000001','permissions.manage',false) $$,'23514','LAST_ACCESS_ADMIN_REQUIRED','last active owner cannot remove own permission administration');

select * from finish();
rollback;
