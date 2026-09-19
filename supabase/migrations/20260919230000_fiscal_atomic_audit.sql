-- owners: audit,fiscal
-- cross-module-task: docs/task-contracts/fiscal-atomic-audit-225.json
-- allow-static-routines: true

create or replace function public.issue_mock_fiscal_document_atomic(
  p_document_id uuid,
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
  p_issued_at timestamptz,
  p_xml_path text,
  p_pdf_path text,
  p_xml_sha256 text,
  p_xml_byte_length bigint,
  p_pdf_sha256 text,
  p_pdf_byte_length bigint
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null
    or public.current_app_role() not in ('psychologist_owner','accounting')
    or not public.has_permission('fiscal.issue') then
    raise exception 'FISCAL_ISSUE_FORBIDDEN' using errcode = '42501';
  end if;

  if p_document_id is null
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
    or p_issued_at is null
    or p_xml_path <> p_document_id::text || '/nfse.xml'
    or p_pdf_path <> p_document_id::text || '/nfse.pdf'
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

  insert into public.fiscal_documents (
    id,source_type,source_id,person_id,payer_person_id,amount_cents,
    profile_id,profile_version,treatment_id,treatment_version,provider,
    idempotency_key,external_id,protocol,status,issued_at,
    xml_path,pdf_path,xml_sha256,xml_byte_length,pdf_sha256,pdf_byte_length
  ) values (
    p_document_id,p_source_type,p_source_id,p_person_id,p_payer_person_id,p_amount_cents,
    p_profile_id,p_profile_version,p_treatment_id,p_treatment_version,'mock',
    p_idempotency_key,p_external_id,p_protocol,'issued',p_issued_at,
    p_xml_path,p_pdf_path,p_xml_sha256,p_xml_byte_length,p_pdf_sha256,p_pdf_byte_length
  );

  insert into public.fiscal_attempts (
    fiscal_document_id,attempt_number,operation,status,provider_status,
    correlation_id,finished_at
  ) values (
    p_document_id,1,'issue','succeeded','issued',gen_random_uuid(),clock_timestamp()
  );

  insert into public.audit_events (
    actor_user_id,action,entity_type,entity_id,correlation_id,metadata
  ) values (
    actor,'fiscal.mock_issued','fiscal_document',p_document_id,p_document_id::text,
    jsonb_build_object(
      'sourceType',p_source_type,
      'sourceId',p_source_id,
      'amountCents',p_amount_cents,
      'provider','mock',
      'synthetic',true,
      'liveEnabled',false
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
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  document_row public.fiscal_documents%rowtype;
  cancellation_id uuid;
  v_idempotency_key text := 'fiscal-cancel:' || p_document_id::text;
begin
  if actor is null
    or public.current_app_role() <> 'psychologist_owner'
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

revoke all on function public.issue_mock_fiscal_document_atomic(
  uuid,text,uuid,uuid,uuid,bigint,uuid,integer,uuid,integer,text,text,text,
  timestamptz,text,text,text,bigint,text,bigint
) from public,anon;
grant execute on function public.issue_mock_fiscal_document_atomic(
  uuid,text,uuid,uuid,uuid,bigint,uuid,integer,uuid,integer,text,text,text,
  timestamptz,text,text,text,bigint,text,bigint
) to authenticated;

revoke all on function public.cancel_mock_fiscal_document_atomic(uuid,text)
from public,anon;
grant execute on function public.cancel_mock_fiscal_document_atomic(uuid,text)
to authenticated;
