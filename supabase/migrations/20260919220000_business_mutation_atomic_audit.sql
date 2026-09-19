-- owners: appointments,audit,events,forms,payables,receivables
-- cross-module-task: docs/task-contracts/business-mutation-atomic-audit-202.json
-- allow-static-routines: true

-- Appointment creation is a single-row mutation, so a trigger guarantees that
-- the business row and its audit event commit or roll back together.
create or replace function public.audit_appointment_created()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    insert into public.audit_events (
      actor_user_id, action, entity_type, entity_id, correlation_id, metadata
    ) values (
      auth.uid(), 'appointment.created', 'appointment', new.id, new.id::text,
      jsonb_build_object(
        'personId', new.person_id,
        'serviceId', new.service_id,
        'startsAt', new.starts_at,
        'endsAt', new.ends_at,
        'policyVersion', new.policy_version
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_audit_created on public.appointments;
create trigger appointments_audit_created
after insert on public.appointments
for each row execute function public.audit_appointment_created();

create or replace function public.update_appointment_schedule_atomic(
  p_appointment_id uuid,
  p_person_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_next_status text,
  p_cancellation_deadline_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_before public.appointments%rowtype;
begin
  if v_actor is null or not public.has_permission('appointments.update') then
    raise exception 'AGENDA_UPDATE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_ends_at <= p_starts_at then
    raise exception 'AGENDA_INVALID_INTERVAL' using errcode = '22023';
  end if;

  select * into v_before
  from public.appointments
  where id = p_appointment_id
  for update;
  if not found then raise exception 'AGENDA_APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_before.status in ('cancelled_in_time','cancelled_late','cancelled_by_provider','completed','no_show') then
    raise exception 'AGENDA_TERMINAL_APPOINTMENT_IMMUTABLE' using errcode = '55000';
  end if;
  if p_next_status <> v_before.status and not public.has_permission('appointments.reschedule') then
    raise exception 'AGENDA_RESCHEDULE_FORBIDDEN' using errcode = '42501';
  end if;

  update public.appointments
  set person_id = p_person_id,
      service_id = p_service_id,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      status = p_next_status,
      cancellation_deadline_at = p_cancellation_deadline_at
  where id = p_appointment_id;

  if p_next_status <> v_before.status then
    insert into public.appointment_status_history (
      appointment_id, from_status, to_status, changed_by_user_id
    ) values (
      p_appointment_id, v_before.status, p_next_status, v_actor
    );
  end if;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, 'appointment.updated', 'appointment', p_appointment_id, p_appointment_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'personId', v_before.person_id, 'serviceId', v_before.service_id,
        'startsAt', v_before.starts_at, 'endsAt', v_before.ends_at, 'status', v_before.status
      ),
      'after', jsonb_build_object(
        'personId', p_person_id, 'serviceId', p_service_id,
        'startsAt', p_starts_at, 'endsAt', p_ends_at, 'status', p_next_status,
        'cancellationDeadlineAt', p_cancellation_deadline_at
      ),
      'policyVersion', v_before.policy_version
    )
  );
end;
$$;

revoke all on function public.update_appointment_schedule_atomic(uuid,uuid,uuid,timestamptz,timestamptz,text,timestamptz) from public, anon;
grant execute on function public.update_appointment_schedule_atomic(uuid,uuid,uuid,timestamptz,timestamptz,text,timestamptz) to authenticated;

create or replace function public.change_appointment_status_atomic(
  p_appointment_id uuid,
  p_expected_status text,
  p_next_status text,
  p_command text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.appointments%rowtype;
  v_permission text;
  v_action text;
begin
  v_permission := case p_command
    when 'send_confirmation' then 'appointments.confirm'
    when 'confirm' then 'appointments.confirm'
    when 'check_in' then 'appointments.checkin'
    when 'request_reschedule' then 'appointments.reschedule'
    when 'reschedule' then 'appointments.reschedule'
    when 'cancel_in_time' then 'appointments.cancel'
    when 'cancel_late' then 'appointments.cancel'
    when 'cancel_by_provider' then 'appointments.cancel'
    when 'mark_no_show' then 'appointments.no_show'
    when 'complete' then 'appointments.complete'
    when 'start' then 'clinical.create'
    else null
  end;
  if v_actor is null or v_permission is null or not public.has_permission(v_permission) then
    raise exception 'AGENDA_STATUS_FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_row from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'AGENDA_APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_row.status <> p_expected_status then
    raise exception 'AGENDA_STATUS_CONFLICT' using errcode = '40001';
  end if;

  update public.appointments set status = p_next_status where id = p_appointment_id;
  insert into public.appointment_status_history (
    appointment_id, from_status, to_status, changed_by_user_id
  ) values (
    p_appointment_id, v_row.status, p_next_status, v_actor
  );

  v_action := case
    when p_command = 'start' then 'appointment.care_started'
    when p_command = 'complete' then 'appointment.care_completed'
    else 'appointment.status_changed'
  end;
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, v_action, 'appointment', p_appointment_id, p_appointment_id::text,
    case
      when p_command in ('start','complete') then jsonb_build_object(
        'personId', v_row.person_id, 'fromStatus', v_row.status, 'toStatus', p_next_status, 'command', p_command
      )
      else jsonb_build_object('fromStatus', v_row.status, 'toStatus', p_next_status, 'command', p_command)
    end
  );
end;
$$;

revoke all on function public.change_appointment_status_atomic(uuid,text,text,text) from public, anon;
grant execute on function public.change_appointment_status_atomic(uuid,text,text,text) to authenticated;

create or replace function public.create_appointment_charge_atomic(
  p_appointment_id uuid,
  p_amount_cents bigint,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appointment public.appointments%rowtype;
  v_id uuid;
begin
  if v_actor is null or not public.has_permission('finance.receive') then
    raise exception 'AGENDA_CHARGE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or btrim(coalesce(p_idempotency_key,'')) = '' then
    raise exception 'AGENDA_CHARGE_INVALID' using errcode = '22023';
  end if;
  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'AGENDA_APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_appointment.status not in ('no_show','cancelled_late') then
    raise exception 'AGENDA_APPOINTMENT_NOT_CHARGEABLE' using errcode = '55000';
  end if;

  select id into v_id from public.receivables where idempotency_key = p_idempotency_key;
  if v_id is not null then return v_id; end if;

  insert into public.receivables (
    source_type, source_id, person_id, payer_person_id, original_amount_cents, idempotency_key
  ) values (
    'appointment', p_appointment_id, v_appointment.person_id, v_appointment.person_id,
    p_amount_cents, p_idempotency_key
  ) returning id into v_id;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, 'receivable.appointment_charge_created', 'receivable', v_id, p_appointment_id::text,
    jsonb_build_object(
      'appointmentId', p_appointment_id,
      'appointmentStatus', v_appointment.status,
      'amountCents', p_amount_cents
    )
  );
  return v_id;
end;
$$;

revoke all on function public.create_appointment_charge_atomic(uuid,bigint,text) from public, anon;
grant execute on function public.create_appointment_charge_atomic(uuid,bigint,text) to authenticated;

-- Event row changes are self-contained, so audit triggers are transactional.
create or replace function public.audit_event_row_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return new; end if;
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    auth.uid(),
    case when tg_op = 'INSERT' then 'event.created' else 'event.updated' end,
    'event', new.id, new.id::text,
    jsonb_build_object('startsAt', new.starts_at, 'endsAt', new.ends_at, 'capacity', new.capacity)
  );
  return new;
end;
$$;
drop trigger if exists events_audit_insert_update on public.events;
create trigger events_audit_insert_update
after insert or update on public.events
for each row execute function public.audit_event_row_mutation();

create or replace function public.register_event_participant_atomic(
  p_event_id uuid,
  p_person_id uuid,
  p_price_cents bigint,
  p_status text
)
returns setof uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_registration_id uuid;
begin
  if v_actor is null or not public.has_permission('events.manage') then
    raise exception 'EVENT_FORBIDDEN' using errcode = '42501';
  end if;
  if p_price_cents < 0 or p_status not in ('confirmed','pending_payment','waitlisted','cancelled') then
    raise exception 'EVENT_REGISTRATION_INVALID' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  if not exists (
    select 1 from public.events where id = p_event_id and status in ('open','planned')
  ) then raise exception 'EVENT_NOT_OPEN'; end if;
  if (
    select count(*) from public.event_registrations
    where event_id = p_event_id and status <> 'cancelled'
  ) >= (
    select capacity from public.events where id = p_event_id
  ) then raise exception 'EVENT_FULL'; end if;

  insert into public.event_registrations (event_id, person_id, price_cents, status)
  values (p_event_id, p_person_id, p_price_cents, p_status)
  returning id into v_registration_id;

  if p_price_cents > 0 then
    insert into public.receivables (
      source_type, source_id, person_id, payer_person_id, original_amount_cents, idempotency_key
    ) values (
      'event_registration', v_registration_id, p_person_id, p_person_id,
      p_price_cents, format('event-registration:%s', v_registration_id)
    );
  end if;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, 'event.registration_created', 'event_registration', v_registration_id, v_registration_id::text,
    jsonb_build_object(
      'eventId', p_event_id, 'personId', p_person_id,
      'priceCents', p_price_cents, 'status', p_status
    )
  );
  return next v_registration_id;
end;
$$;

revoke all on function public.register_event_participant_atomic(uuid,uuid,bigint,text) from public, anon;
grant execute on function public.register_event_participant_atomic(uuid,uuid,bigint,text) to authenticated;

create or replace function public.audit_event_registration_updated()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    insert into public.audit_events (
      actor_user_id, action, entity_type, entity_id, correlation_id, metadata
    ) values (
      auth.uid(), 'event.registration_updated', 'event_registration', new.id, new.id::text,
      jsonb_build_object('status', new.status, 'attendance', new.attendance_status)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists event_registrations_audit_updated on public.event_registrations;
create trigger event_registrations_audit_updated
after update of status, attendance_status on public.event_registrations
for each row
when (old.status is distinct from new.status or old.attendance_status is distinct from new.attendance_status)
execute function public.audit_event_registration_updated();

create or replace function public.audit_event_expense_created()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    insert into public.audit_events (
      actor_user_id, action, entity_type, entity_id, correlation_id, metadata
    ) values (
      auth.uid(), 'event.expense_created', 'event_expense', new.id, new.id::text,
      jsonb_build_object('eventId', new.event_id, 'amountCents', new.amount_cents, 'description', new.description)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists event_expenses_audit_created on public.event_expenses;
create trigger event_expenses_audit_created
after insert on public.event_expenses
for each row execute function public.audit_event_expense_created();

create or replace function public.record_receivable_adjustment_atomic(
  p_receivable_id uuid,
  p_adjustment_cents bigint,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null or not public.has_permission('finance.adjust') then
    raise exception 'FINANCE_ADJUSTMENT_FORBIDDEN' using errcode = '42501';
  end if;
  if p_adjustment_cents = 0 or btrim(coalesce(p_reason,'')) = '' then
    raise exception 'FINANCE_ADJUSTMENT_INVALID' using errcode = '22023';
  end if;
  perform 1 from public.receivables where id = p_receivable_id for update;
  if not found then raise exception 'FINANCE_RECEIVABLE_NOT_FOUND' using errcode = 'P0002'; end if;

  insert into public.receivable_adjustments (
    receivable_id, adjustment_cents, reason, actor_id
  ) values (
    p_receivable_id, p_adjustment_cents, btrim(p_reason), v_actor
  ) returning id into v_id;

  perform public.refresh_receivable_status_atomic(p_receivable_id);
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, 'receivable.adjusted', 'receivable_adjustment', v_id, v_id::text,
    jsonb_build_object(
      'receivableId', p_receivable_id,
      'adjustmentCents', p_adjustment_cents,
      'reason', btrim(p_reason)
    )
  );
  return v_id;
end;
$$;

revoke all on function public.record_receivable_adjustment_atomic(uuid,bigint,text) from public, anon;
grant execute on function public.record_receivable_adjustment_atomic(uuid,bigint,text) to authenticated;

create or replace function public.audit_payables_row_created()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_type text;
  v_metadata jsonb;
begin
  if auth.uid() is null then return new; end if;
  case tg_table_name
    when 'vendors' then
      v_action := 'vendor.created'; v_type := 'vendor';
      v_metadata := jsonb_build_object('legalName', new.legal_name);
    when 'expense_categories' then
      v_action := 'expense_category.created'; v_type := 'expense_category';
      v_metadata := jsonb_build_object('name', new.name);
    when 'recurrence_rules' then
      v_action := 'payable.recurrence_created'; v_type := 'recurrence_rule';
      v_metadata := jsonb_build_object(
        'vendorId', new.vendor_id, 'categoryId', new.category_id,
        'amountCents', new.amount_cents, 'startDate', new.start_date,
        'dayOfMonth', new.day_of_month, 'fallback', new.month_end_fallback
      );
    when 'payables' then
      v_action := 'payable.created'; v_type := 'payable';
      v_metadata := jsonb_build_object(
        'vendorId', new.vendor_id, 'categoryId', new.category_id,
        'amountCents', new.amount_cents, 'dueDate', new.due_date,
        'competence', new.competence
      );
    else
      raise exception 'AUDIT_PAYABLE_TABLE_UNSUPPORTED';
  end case;
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    auth.uid(), v_action, v_type, new.id, new.id::text, v_metadata
  );
  return new;
end;
$$;

drop trigger if exists vendors_audit_created on public.vendors;
create trigger vendors_audit_created after insert on public.vendors
for each row execute function public.audit_payables_row_created();
drop trigger if exists expense_categories_audit_created on public.expense_categories;
create trigger expense_categories_audit_created after insert on public.expense_categories
for each row execute function public.audit_payables_row_created();
drop trigger if exists recurrence_rules_audit_created on public.recurrence_rules;
create trigger recurrence_rules_audit_created after insert on public.recurrence_rules
for each row execute function public.audit_payables_row_created();
drop trigger if exists payables_audit_created on public.payables;
create trigger payables_audit_created after insert on public.payables
for each row execute function public.audit_payables_row_created();

create or replace function public.create_form_template_atomic(
  p_template_id uuid,
  p_version_id uuid,
  p_name text,
  p_classification text,
  p_schema jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.has_permission('forms.manage') then
    raise exception 'FORM_TEMPLATE_FORBIDDEN' using errcode = '42501';
  end if;
  if btrim(coalesce(p_name,'')) = ''
    or p_classification not in ('administrative','sensitive')
    or jsonb_typeof(p_schema) <> 'object' then
    raise exception 'FORM_TEMPLATE_INVALID' using errcode = '22023';
  end if;

  insert into public.form_templates (id, name, active_version)
  values (p_template_id, btrim(p_name), 1);
  insert into public.form_template_versions (
    id, template_id, version, data_classification, schema
  ) values (
    p_version_id, p_template_id, 1, p_classification, p_schema
  );
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, 'form_template.created', 'form_template', p_template_id, p_template_id::text,
    jsonb_build_object(
      'templateVersionId', p_version_id,
      'classification', p_classification,
      'fieldCount', coalesce(jsonb_array_length(p_schema->'fields'), 0)
    )
  );
  return p_template_id;
end;
$$;

revoke all on function public.create_form_template_atomic(uuid,uuid,text,text,jsonb) from public, anon;
grant execute on function public.create_form_template_atomic(uuid,uuid,text,text,jsonb) to authenticated;

create or replace function public.issue_form_capability_atomic(
  p_submission_id uuid,
  p_person_id uuid,
  p_template_version_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_capability_id uuid;
begin
  if v_actor is null or not public.has_permission('forms.send') then
    raise exception 'FORM_LINK_FORBIDDEN' using errcode = '42501';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at <= clock_timestamp() then
    raise exception 'FORM_LINK_INVALID' using errcode = '22023';
  end if;
  if not exists (select 1 from public.people where id = p_person_id) then
    raise exception 'FORM_PERSON_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.form_template_versions where id = p_template_version_id
  ) then raise exception 'FORM_TEMPLATE_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;

  insert into public.form_submissions (
    id, subject_id, template_version_id, status
  ) values (
    p_submission_id, p_person_id, p_template_version_id, 'draft'
  );
  insert into public.capabilities (
    token_hash, purpose, subject_type, subject_id, expires_at
  ) values (
    p_token_hash, 'form_fill', 'form_submission', p_submission_id, p_expires_at
  ) returning id into v_capability_id;
  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, correlation_id, metadata
  ) values (
    v_actor, 'form.capability_issued', 'form_submission', p_submission_id, p_submission_id::text,
    jsonb_build_object(
      'personId', p_person_id,
      'templateVersionId', p_template_version_id,
      'expiresAt', p_expires_at
    )
  );
  return v_capability_id;
end;
$$;

revoke all on function public.issue_form_capability_atomic(uuid,uuid,uuid,text,timestamptz) from public, anon;
grant execute on function public.issue_form_capability_atomic(uuid,uuid,uuid,text,timestamptz) to authenticated;
