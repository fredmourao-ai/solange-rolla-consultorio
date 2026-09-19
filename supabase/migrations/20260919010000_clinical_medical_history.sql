-- owners: clinical,people
-- cross-module-task: docs/task-contracts/clinical-medical-history.json
-- allow-static-routines: true

create table clinical.medical_histories (
  id uuid primary key,
  person_id uuid not null references public.people(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null check (key_version > 0),
  revision integer not null check (revision > 0),
  source_type text not null default 'clinician_review'
    check (source_type in ('clinician_review', 'patient_signed_form_review')),
  source_reference_id uuid,
  supersedes_id uuid references clinical.medical_histories(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table clinical.medical_histories enable row level security;
alter table clinical.medical_histories force row level security;

create policy clinical_medical_histories_select_authorized
on clinical.medical_histories
for select
to authenticated
using (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
  and public.has_permission('clinical.read')
);

create policy clinical_medical_histories_insert_authorized
on clinical.medical_histories
for insert
to authenticated
with check (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
  and public.has_permission('clinical.create')
  and author_user_id = auth.uid()
);

create unique index clinical_medical_histories_one_root_per_person_idx
on clinical.medical_histories(person_id)
where supersedes_id is null;

create unique index clinical_medical_histories_one_successor_idx
on clinical.medical_histories(supersedes_id)
where supersedes_id is not null;

create index clinical_medical_histories_person_created_idx
on clinical.medical_histories(person_id, created_at desc);

create trigger clinical_medical_histories_immutable_update
before update on clinical.medical_histories
for each row execute function clinical.reject_clinical_record_mutation();

create trigger clinical_medical_histories_immutable_delete
before delete on clinical.medical_histories
for each row execute function clinical.reject_clinical_record_mutation();

revoke all on clinical.medical_histories from public, anon;
grant select, insert on clinical.medical_histories to authenticated;

create or replace function public.create_medical_history(
  p_record_id uuid,
  p_person_id uuid,
  p_author_user_id uuid,
  p_ciphertext text,
  p_iv text,
  p_auth_tag text,
  p_key_version integer,
  p_source_type text default 'clinician_review',
  p_source_reference_id uuid default null,
  p_supersedes_id uuid default null
)
returns table (
  id uuid,
  person_id uuid,
  author_user_id uuid,
  ciphertext text,
  iv text,
  auth_tag text,
  key_version integer,
  revision integer,
  source_type text,
  source_reference_id uuid,
  supersedes_id uuid,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public, clinical
as $$
declare
  v_revision integer := 1;
  v_previous_revision integer;
begin
  if not public.has_permission('clinical.create')
    or public.current_app_role() <> 'psychologist_owner'
    or public.current_aal() <> 'aal2'
    or p_author_user_id <> auth.uid() then
    raise exception 'CLINICAL_PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  if p_source_type not in ('clinician_review', 'patient_signed_form_review') then
    raise exception 'MEDICAL_HISTORY_SOURCE_INVALID' using errcode = '23514';
  end if;

  if not exists (select 1 from public.people where public.people.id = p_person_id) then
    raise exception 'MEDICAL_HISTORY_PERSON_NOT_FOUND' using errcode = '23503';
  end if;

  if p_supersedes_id is null then
    if exists (select 1 from clinical.medical_histories h where h.person_id = p_person_id) then
      raise exception 'MEDICAL_HISTORY_ROOT_EXISTS' using errcode = '23505';
    end if;
  else
    if not public.has_permission('clinical.supersede') then
      raise exception 'CLINICAL_SUPERSEDE_FORBIDDEN' using errcode = '42501';
    end if;

    select h.revision
    into v_previous_revision
    from clinical.medical_histories h
    where h.id = p_supersedes_id
      and h.person_id = p_person_id;

    if v_previous_revision is null then
      raise exception 'MEDICAL_HISTORY_SUPERSEDE_MISMATCH' using errcode = '23514';
    end if;

    if exists (select 1 from clinical.medical_histories h where h.supersedes_id = p_supersedes_id) then
      raise exception 'MEDICAL_HISTORY_ALREADY_SUPERSEDED' using errcode = '23505';
    end if;

    v_revision := v_previous_revision + 1;
  end if;

  return query
  insert into clinical.medical_histories (
    id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version,
    revision, source_type, source_reference_id, supersedes_id
  ) values (
    p_record_id, p_person_id, p_author_user_id, p_ciphertext, p_iv, p_auth_tag, p_key_version,
    v_revision, p_source_type, p_source_reference_id, p_supersedes_id
  )
  returning clinical.medical_histories.id, clinical.medical_histories.person_id,
    clinical.medical_histories.author_user_id, clinical.medical_histories.ciphertext,
    clinical.medical_histories.iv, clinical.medical_histories.auth_tag,
    clinical.medical_histories.key_version, clinical.medical_histories.revision,
    clinical.medical_histories.source_type, clinical.medical_histories.source_reference_id,
    clinical.medical_histories.supersedes_id, clinical.medical_histories.created_at;

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    auth.uid(),
    case when p_supersedes_id is null then 'medical_history.created' else 'medical_history.superseded' end,
    'medical_history',
    p_record_id,
    p_record_id,
    jsonb_build_object(
      'personId', p_person_id,
      'revision', v_revision,
      'sourceType', p_source_type,
      'sourceReferenceId', p_source_reference_id
    )
  );
end;
$;

create or replace function public.list_medical_history_metadata(p_person_id uuid)
returns table (
  id uuid,
  person_id uuid,
  revision integer,
  source_type text,
  source_reference_id uuid,
  supersedes_id uuid,
  created_at timestamptz
)
language sql
security invoker
set search_path = public, clinical
as $$
  select h.id, h.person_id, h.revision, h.source_type, h.source_reference_id, h.supersedes_id, h.created_at
  from clinical.medical_histories h
  where h.person_id = p_person_id
  order by h.created_at asc;
$$;

create or replace function public.get_medical_history_envelope(record_id uuid)
returns table (
  id uuid,
  person_id uuid,
  author_user_id uuid,
  ciphertext text,
  iv text,
  auth_tag text,
  key_version integer,
  revision integer,
  source_type text,
  source_reference_id uuid,
  supersedes_id uuid,
  created_at timestamptz
)
language sql
security invoker
set search_path = public, clinical
as $$
  select h.id, h.person_id, h.author_user_id, h.ciphertext, h.iv, h.auth_tag, h.key_version,
    h.revision, h.source_type, h.source_reference_id, h.supersedes_id, h.created_at
  from clinical.medical_histories h
  where h.id = record_id;
$$;

revoke all on function public.create_medical_history(uuid, uuid, uuid, text, text, text, integer, text, uuid, uuid) from public, anon;
revoke all on function public.list_medical_history_metadata(uuid) from public, anon;
revoke all on function public.get_medical_history_envelope(uuid) from public, anon;
grant execute on function public.create_medical_history(uuid, uuid, uuid, text, text, text, integer, text, uuid, uuid) to authenticated;
grant execute on function public.list_medical_history_metadata(uuid) to authenticated;
grant execute on function public.get_medical_history_envelope(uuid) to authenticated;
