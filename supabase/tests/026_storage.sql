begin;

select plan(8);

select is((select public from storage.buckets where id = 'signed-documents-private'), false, 'signed documents bucket is private');
select is((select public from storage.buckets where id = 'fiscal-documents-private'), false, 'fiscal documents bucket is private');
select is((select public from storage.buckets where id = 'financial-receipts-private'), false, 'financial receipts bucket is private');
select is((select public from storage.buckets where id = 'clinical-private'), false, 'clinical bucket is private');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'private_storage_select_clinical_owner_aal2'), 'clinical read policy exists');
select ok((select qual::text like '%psychologist_owner%' and qual::text like '%aal2%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'private_storage_select_clinical_owner_aal2'), 'clinical policy requires owner and AAL2');
select ok(not coalesce((select public from storage.buckets where id = 'clinical-private'), true), 'clinical bucket is not public');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'private_storage_select_nonclinical'), 'nonclinical policy is explicit');

select * from finish();
rollback;
