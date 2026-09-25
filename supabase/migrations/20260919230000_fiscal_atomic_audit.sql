-- owners: audit,fiscal,identity,platform
-- cross-module-task: docs/task-contracts/fiscal-atomic-audit-225.json
-- allow-static-routines: true

-- Replace legacy role-only table mutation policies with read-only permission policies.
drop policy if exists fiscal_profiles_accounting on public.fiscal_profiles;
drop policy if exists fiscal_treatments_accounting on public.fiscal_treatments;
drop policy if exists fiscal_documents_accounting on public.fiscal_documents;
drop policy if exists fiscal_attempts_accounting on public.fiscal_attempts;
drop policy if exists fiscal_cancellation_events_accounting on public.fiscal_cancellation_events;

create policy fiscal_profiles_read_authorized
on public.fiscal_profiles for select to authenticated
using (public.has_permission('fiscal.read'));

create policy fiscal_treatments_read_authorized
on public.fiscal_treatments for select to authenticated
using (public.has_permission('fiscal.read'));

create policy fiscal_documents_read_authorized
on public.fiscal_documents for select to authenticated
using (public.has_permission('fiscal.read'));

create policy fiscal_attempts_read_authorized
on public.fiscal_attempts for select to authenticated
using (public.has_permission('fiscal.read'));

create policy fiscal_cancellation_events_read_authorized
on public.fiscal_cancellation_events for select to authenticated
using (public.has_permission('fiscal.read'));

revoke insert, update on
  public.fiscal_profiles,
  public.fiscal_treatments,
  public.fiscal_documents,
  public.fiscal_attempts,
  public.fiscal_cancellation_events
from authenticated;

grant select on
  public.fiscal_profiles,
  public.fiscal_treatments,
  public.fiscal_documents,
  public.fiscal_attempts,
  public.fiscal_cancellation_events
to authenticated;

-- The base private-storage policy is permissive for authenticated users.
-- Add restrictive guards for fiscal reads/inserts, and a narrowly-scoped delete
-- policy used only while a durable issue saga is recoverable.
drop policy if exists private_storage_fiscal_select_guard on storage.objects;
create policy private_storage_fiscal_select_guard
on storage.objects
as restrictive
for select
to authenticated
using (
  bucket_id <> 'fiscal-documents-private'
  or public.has_permission('fiscal.read')
);

drop policy if exists private_storage_fiscal_insert_guard on storage.objects;
create policy private_storage_fiscal_insert_guard
on storage.objects
as restrictive
for insert
to authenticated
with check (
  bucket_id <> 'fiscal-documents-private'
  or (
    public.has_permission('fiscal.issue')
    and exists (
      select 1
      from public.fiscal_documents d
      join public.fiscal_attempts a
        on a.fiscal_document_id = d.id
       and a.operation = 'issue'
       and a.status = 'started'
      where d.id::text = split_part(storage.objects.name, '/', 1)
        and a.correlation_id::text = split_part(storage.objects.name, '/', 2)
        and d.status = 'processing'
        and storage.objects.name in (d.xml_path, d.pdf_path)
    )
  )
);

drop policy if exists private_storage_delete_fiscal_recoverable on storage.objects;
create policy private_storage_delete_fiscal_recoverable
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fiscal-documents-private'
  and public.has_permission('fiscal.issue')
  and exists (
    select 1
    from public.fiscal_documents d
    join public.fiscal_attempts a
      on a.fiscal_document_id = d.id
     and a.operation = 'issue'
     and a.status in ('started','retryable_failure')
    where d.id::text = split_part(storage.objects.name, '/', 1)
      and a.correlation_id::text = split_part(storage.objects.name, '/', 2)
      and d.status in ('processing','failed_retryable')
      and storage.objects.name in (
        d.id::text || '/' || a.correlation_id::text || '/nfse.xml',
        d.id::text || '/' || a.correlation_id::text || '/nfse.pdf'
      )
  )
);

create or replace function public.begin_mock_fiscal_document_issue_atomic(
  p_document_id uuid,
  p_attempt_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_person_id uuid,
  p_payer_person_id uuid,
  p_amount_cents bigint,
  p_profile_id uuid,
  p_profile_version integer,
  p_treatment_id uuid,
  p_treatment_version integer,
  p_idempotency_key text,
  p_external_id text,
  p_protocol text,
  p_xml_path text,
  p_pdf_path text,
  p_xml_sha256 text,
  p_xml_byte_length bigint,
  p_pdf_sha256 text,
  p_pdf_byte_length bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  existing_row public.fiscal_documents%rowtype;
  next_attempt integer;
  active_attempt integer;
  active_attempt_id uuid;
  active_started_at timestamptz;
  previous_attempt_id uuid;
begin
  if actor is null
    or not public.has_permission('fiscal.issue')
    or not public.has_permission('fiscal.read') then
    raise exception 'FISCAL_ISSUE_FORBIDDEN' using errcode = '42501';
  end if;

  if p_document_id is null
    or p_attempt_id is null
    or p_source_type not in (
      'appointment_completed','appointment_late_cancellation',
      'appointment_no_show','event_registration','other_service'
    )
    or p_source_id is null
    or p_person_id is null
    or p_payer_person_id is null
    or p_amount_cents is null or p_amount_cents <= 0
    or p_profile_id is null or p_profile_version is null or p_profile_version <= 0
    or p_treatment_id is null or p_treatment_version is null or p_treatment_version <= 0
    or p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or p_external_id is null or btrim(p_external_id) = ''
    or p_protocol is null or btrim(p_protocol) = ''
    or p_xml_path <> p_document_id::text || '/' || p_attempt_id::text || '/nfse.xml'
    or p_pdf_path <> p_document_id::text || '/' || p_attempt_id::text || '/nfse.pdf'
    or p_xml_sha256 is null or p_xml_sha256 !~ '^[a-f0-9]{64}$'
    or p_pdf_sha256 is null or p_pdf_sha256 !~ '^[a-f0-9]{64}$'
    or p_xml_byte_length is null or p_xml_byte_length <= 0
    or p_pdf_byte_length is null or p_pdf_byte_length <= 0 then
    raise exception 'FISCAL_ISSUE_INPUT_INVALID' using errcode = '22023';
  end if;

  if p_idempotency_key <> format(
    '%s:%s:%s:%s',
    p_source_type,
    p_source_id,
    p_profile_version,
    p_treatment_version
  ) then
    raise exception 'FISCAL_IDEMPOTENCY_KEY_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.fiscal_profiles
    where id = p_profile_id
      and version = p_profile_version
      and active
  ) then
    raise exception 'FISCAL_PROFILE_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.fiscal_treatments
    where id = p_treatment_id
      and source_kind = p_source_type
      and version = p_treatment_version
      and issuance_rule <> 'not_issuable'
  ) then
    raise exception 'FISCAL_TREATMENT_INVALID' using errcode = '22023';
  end if;

  select *
  into existing_row
  from public.fiscal_documents
  where idempotency_key = p_idempotency_key
  for update;

  if found then
    if existing_row.id <> p_document_id
      or existing_row.source_type <> p_source_type
      or existing_row.source_id <> p_source_id
      or existing_row.person_id <> p_person_id
      or existing_row.payer_person_id <> p_payer_person_id
      or existing_row.amount_cents <> p_amount_cents
      or existing_row.profile_id <> p_profile_id
      or existing_row.profile_version <> p_profile_version
      or existing_row.treatment_id <> p_treatment_id
      or existing_row.treatment_version <> p_treatment_version
      or existing_row.provider <> 'mock'
      or existing_row.external_id <> p_external_id
      or existing_row.protocol <> p_protocol
      or existing_row.xml_sha256 <> p_xml_sha256
      or existing_row.xml_byte_length <> p_xml_byte_length
      or existing_row.pdf_sha256 <> p_pdf_sha256
      or existing_row.pdf_byte_length <> p_pdf_byte_length then
      raise exception 'FISCAL_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;

    if existing_row.status = 'issued' then
      return jsonb_build_object(
        'state','issued',
        'documentId',existing_row.id,
        'attemptId',null,
        'previousAttemptId',null
      );
    end if;

    if existing_row.status = 'processing' then
      select attempt_number, correlation_id, started_at
      into active_attempt, active_attempt_id, active_started_at
      from public.fiscal_attempts
      where fiscal_document_id = existing_row.id
        and operation = 'issue'
        and status = 'started'
      order by attempt_number desc
      limit 1
      for update;

      if active_attempt is null or active_attempt_id is null then
        raise exception 'FISCAL_ISSUE_ATTEMPT_MISSING' using errcode = '55000';
      end if;

      if active_attempt_id = p_attempt_id then
        return jsonb_build_object(
          'state','process',
          'documentId',existing_row.id,
          'attemptId',p_attempt_id,
          'previousAttemptId',null
        );
      end if;

      if active_started_at > clock_timestamp() - interval '5 minutes' then
        raise exception 'FISCAL_ISSUE_IN_PROGRESS' using errcode = '55P03';
      end if;

      update public.fiscal_attempts
      set status = 'retryable_failure',
          provider_status = 'lease_expired',
          error_code = 'PROCESSING_LEASE_EXPIRED',
          finished_at = clock_timestamp()
      where fiscal_document_id = existing_row.id
        and operation = 'issue'
        and attempt_number = active_attempt
        and correlation_id = active_attempt_id
        and status = 'started';

      insert into public.audit_events (
        actor_user_id,action,entity_type,entity_id,correlation_id,metadata
      ) values (
        actor,'fiscal.mock_issue_lease_expired','fiscal_document',
        existing_row.id,existing_row.id::text,
        jsonb_build_object('attempt',active_attempt,'provider','mock','synthetic',true)
      );

      previous_attempt_id := active_attempt_id;
      update public.fiscal_documents
      set status = 'failed_retryable'
      where id = existing_row.id;
      existing_row.status := 'failed_retryable';
    end if;

    if existing_row.status <> 'failed_retryable' then
      raise exception 'FISCAL_ISSUE_INVALID_STATE' using errcode = '55000';
    end if;

    if previous_attempt_id is null then
      select correlation_id
      into previous_attempt_id
      from public.fiscal_attempts
      where fiscal_document_id = existing_row.id
        and operation = 'issue'
        and status = 'retryable_failure'
      order by attempt_number desc
      limit 1;
    end if;

    select coalesce(max(attempt_number), 0) + 1
    into next_attempt
    from public.fiscal_attempts
    where fiscal_document_id = existing_row.id
      and operation = 'issue';

    update public.fiscal_documents
    set status = 'processing',
        xml_path = p_xml_path,
        pdf_path = p_pdf_path
    where id = existing_row.id;

    insert into public.fiscal_attempts (
      fiscal_document_id,attempt_number,operation,status,provider_status,correlation_id
    ) values (
      existing_row.id,next_attempt,'issue','started','storage_pending',p_attempt_id
    );

    insert into public.audit_events (
      actor_user_id,action,entity_type,entity_id,correlation_id,metadata
    ) values (
      actor,'fiscal.mock_issue_retry_started','fiscal_document',existing_row.id,existing_row.id::text,
      jsonb_build_object('attempt',next_attempt,'provider','mock','synthetic',true)
    );

    return jsonb_build_object(
      'state','process',
      'documentId',existing_row.id,
      'attemptId',p_attempt_id,
      'previousAttemptId',previous_attempt_id
    );
  end if;

  insert into public.fiscal_documents (
    id,source_type,source_id,person_id,payer_person_id,amount_cents,
    profile_id,profile_version,treatment_id,treatment_version,provider,
    idempotency_key,external_id,protocol,status,
    xml_path,pdf_path,xml_sha256,xml_byte_length,pdf_sha256,pdf_byte_length
  ) values (
    p_document_id,p_source_type,p_source_id,p_person_id,p_payer_person_id,p_amount_cents,
    p_profile_id,p_profile_version,p_treatment_id,p_treatment_version,'mock',
    p_idempotency_key,p_external_id,p_protocol,'processing',
    p_xml_path,p_pdf_path,p_xml_sha256,p_xml_byte_length,p_pdf_sha256,p_pdf_byte_length
  );

  insert into public.fiscal_attempts (
    fiscal_document_id,attempt_number,operation,status,provider_status,correlation_id
  ) values (
    p_document_id,1,'issue','started','storage_pending',p_attempt_id
  );

  insert into public.audit_events (
    actor_user_id,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'fiscal.mock_issue_started','fiscal_document',p_document_id,p_document_id::text,
    jsonb_build_object(
      'sourceType',p_source_type,
      'sourceId',p_source_id,
      'amountCents',p_amount_cents,
      'attempt',1,
      'provider','mock',
      'synthetic',true,
      'liveEnabled',false
    )
  );

  return jsonb_build_object(
    'state','process',
    'documentId',p_document_id,
    'attemptId',p_attempt_id,
    'previousAttemptId',null
  );
end;
$$;

create or replace function public.complete_mock_fiscal_document_issue_atomic(
  p_document_id uuid,
  p_attempt_id uuid,
  p_issued_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  document_row public.fiscal_documents%rowtype;
  current_attempt integer;
  current_attempt_id uuid;
begin
  if actor is null
    or not public.has_permission('fiscal.issue')
    or not public.has_permission('fiscal.read') then
    raise exception 'FISCAL_ISSUE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_document_id is null or p_attempt_id is null or p_issued_at is null then
    raise exception 'FISCAL_ISSUE_INPUT_INVALID' using errcode = '22023';
  end if;

  select *
  into document_row
  from public.fiscal_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'FISCAL_DOCUMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if document_row.provider <> 'mock' then
    raise exception 'FISCAL_MOCK_ONLY' using errcode = '22023';
  end if;
  if document_row.status = 'issued' then
    return document_row.id;
  end if;
  if document_row.status <> 'processing' then
    raise exception 'FISCAL_ISSUE_INVALID_STATE' using errcode = '55000';
  end if;

  select attempt_number, correlation_id
  into current_attempt, current_attempt_id
  from public.fiscal_attempts
  where fiscal_document_id = p_document_id
    and operation = 'issue'
    and status = 'started'
  order by attempt_number desc
  limit 1
  for update;

  if current_attempt is null or current_attempt_id is null then
    raise exception 'FISCAL_ISSUE_ATTEMPT_MISSING' using errcode = '55000';
  end if;
  if current_attempt_id <> p_attempt_id then
    raise exception 'FISCAL_ISSUE_LEASE_LOST' using errcode = '55P03';
  end if;
  if document_row.xml_path <> p_document_id::text || '/' || p_attempt_id::text || '/nfse.xml'
    or document_row.pdf_path <> p_document_id::text || '/' || p_attempt_id::text || '/nfse.pdf' then
    raise exception 'FISCAL_ISSUE_LEASE_PATH_MISMATCH' using errcode = '55000';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'fiscal-documents-private'
      and name = document_row.xml_path
  ) or not exists (
    select 1 from storage.objects
    where bucket_id = 'fiscal-documents-private'
      and name = document_row.pdf_path
  ) then
    raise exception 'FISCAL_ARTIFACTS_MISSING' using errcode = '55000';
  end if;

  update public.fiscal_documents
  set status = 'issued',
      issued_at = p_issued_at
  where id = p_document_id;

  update public.fiscal_attempts
  set status = 'succeeded',
      provider_status = 'issued',
      finished_at = clock_timestamp()
  where fiscal_document_id = p_document_id
    and operation = 'issue'
    and attempt_number = current_attempt
    and correlation_id = p_attempt_id
    and status = 'started';

  insert into public.audit_events (
    actor_user_id,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'fiscal.mock_issued','fiscal_document',p_document_id,p_document_id::text,
    jsonb_build_object(
      'sourceType',document_row.source_type,
      'sourceId',document_row.source_id,
      'amountCents',document_row.amount_cents,
      'attempt',current_attempt,
      'provider','mock',
      'synthetic',true,
      'liveEnabled',false
    )
  );

  return p_document_id;
end;
$$;

create or replace function public.fail_mock_fiscal_document_issue_atomic(
  p_document_id uuid,
  p_attempt_id uuid,
  p_error_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  document_row public.fiscal_documents%rowtype;
  current_attempt integer;
  current_attempt_id uuid;
  failed_attempt_id uuid;
begin
  if actor is null
    or not public.has_permission('fiscal.issue')
    or not public.has_permission('fiscal.read') then
    raise exception 'FISCAL_ISSUE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_document_id is null
    or p_attempt_id is null
    or p_error_code is null
    or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'FISCAL_ISSUE_FAILURE_INPUT_INVALID' using errcode = '22023';
  end if;

  select *
  into document_row
  from public.fiscal_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'FISCAL_DOCUMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if document_row.provider <> 'mock' then
    raise exception 'FISCAL_MOCK_ONLY' using errcode = '22023';
  end if;

  if document_row.status = 'failed_retryable' then
    select correlation_id
    into failed_attempt_id
    from public.fiscal_attempts
    where fiscal_document_id = p_document_id
      and operation = 'issue'
      and status = 'retryable_failure'
    order by attempt_number desc
    limit 1;
    if failed_attempt_id = p_attempt_id then
      return document_row.id;
    end if;
    raise exception 'FISCAL_ISSUE_LEASE_LOST' using errcode = '55P03';
  end if;

  if document_row.status <> 'processing' then
    raise exception 'FISCAL_ISSUE_INVALID_STATE' using errcode = '55000';
  end if;

  select attempt_number, correlation_id
  into current_attempt, current_attempt_id
  from public.fiscal_attempts
  where fiscal_document_id = p_document_id
    and operation = 'issue'
    and status = 'started'
  order by attempt_number desc
  limit 1
  for update;

  if current_attempt is null or current_attempt_id is null then
    raise exception 'FISCAL_ISSUE_ATTEMPT_MISSING' using errcode = '55000';
  end if;
  if current_attempt_id <> p_attempt_id then
    raise exception 'FISCAL_ISSUE_LEASE_LOST' using errcode = '55P03';
  end if;

  update public.fiscal_documents
  set status = 'failed_retryable'
  where id = p_document_id;

  update public.fiscal_attempts
  set status = 'retryable_failure',
      provider_status = 'failed_retryable',
      error_code = p_error_code,
      finished_at = clock_timestamp()
  where fiscal_document_id = p_document_id
    and operation = 'issue'
    and attempt_number = current_attempt
    and correlation_id = p_attempt_id
    and status = 'started';

  insert into public.audit_events (
    actor_user_id,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'fiscal.mock_issue_failed','fiscal_document',p_document_id,p_document_id::text,
    jsonb_build_object(
      'attempt',current_attempt,
      'errorCode',p_error_code,
      'provider','mock',
      'synthetic',true
    )
  );

  return p_document_id;
end;
$$;

create or replace function public.cancel_mock_fiscal_document_atomic(
  p_document_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  document_row public.fiscal_documents%rowtype;
  cancellation_id uuid;
  v_idempotency_key text := 'fiscal-cancel:' || p_document_id::text;
begin
  if actor is null
    or not public.has_permission('fiscal.cancel') then
    raise exception 'FISCAL_CANCEL_FORBIDDEN' using errcode = '42501';
  end if;
  if p_document_id is null or p_reason is null or btrim(p_reason) = '' then
    raise exception 'FISCAL_CANCEL_INPUT_INVALID' using errcode = '22023';
  end if;

  select *
  into document_row
  from public.fiscal_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'FISCAL_DOCUMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if document_row.provider <> 'mock' then
    raise exception 'FISCAL_MOCK_ONLY' using errcode = '22023';
  end if;

  select id
  into cancellation_id
  from public.fiscal_cancellation_events
  where idempotency_key = v_idempotency_key;

  if cancellation_id is not null then
    if document_row.status = 'cancelled' then
      return cancellation_id;
    end if;
    raise exception 'FISCAL_CANCELLATION_ALREADY_EXISTS' using errcode = '23505';
  end if;

  if document_row.status not in ('issued','cancel_requested') then
    raise exception 'FISCAL_CANCELLATION_INVALID_STATE' using errcode = '55000';
  end if;

  if document_row.status = 'issued' then
    update public.fiscal_documents
    set status = 'cancel_requested'
    where id = p_document_id;
  end if;

  insert into public.fiscal_cancellation_events (
    fiscal_document_id,idempotency_key,reason,requested_by,
    provider_protocol,status,completed_at
  ) values (
    p_document_id,v_idempotency_key,btrim(p_reason),actor,
    document_row.protocol,'cancelled',clock_timestamp()
  )
  returning id into cancellation_id;

  update public.fiscal_documents
  set status = 'cancelled',
      cancelled_at = clock_timestamp()
  where id = p_document_id;

  insert into public.fiscal_attempts (
    fiscal_document_id,attempt_number,operation,status,provider_status,
    correlation_id,finished_at
  ) values (
    p_document_id,1,'cancel','succeeded','cancelled',gen_random_uuid(),clock_timestamp()
  );

  insert into public.audit_events (
    actor_user_id,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'fiscal.mock_cancelled','fiscal_document',p_document_id,p_document_id::text,
    jsonb_build_object('reason',btrim(p_reason),'provider','mock')
  );

  return cancellation_id;
end;
$$;

revoke all on function public.begin_mock_fiscal_document_issue_atomic(
  uuid,uuid,text,uuid,uuid,uuid,bigint,uuid,integer,uuid,integer,text,text,text,
  text,text,text,bigint,text,bigint
) from public,anon;
grant execute on function public.begin_mock_fiscal_document_issue_atomic(
  uuid,uuid,text,uuid,uuid,uuid,bigint,uuid,integer,uuid,integer,text,text,text,
  text,text,text,bigint,text,bigint
) to authenticated;

revoke all on function public.complete_mock_fiscal_document_issue_atomic(uuid,uuid,timestamptz)
from public,anon;
grant execute on function public.complete_mock_fiscal_document_issue_atomic(uuid,uuid,timestamptz)
to authenticated;

revoke all on function public.fail_mock_fiscal_document_issue_atomic(uuid,uuid,text)
from public,anon;
grant execute on function public.fail_mock_fiscal_document_issue_atomic(uuid,uuid,text)
to authenticated;

revoke all on function public.cancel_mock_fiscal_document_atomic(uuid,text)
from public,anon;
grant execute on function public.cancel_mock_fiscal_document_atomic(uuid,text)
to authenticated;
