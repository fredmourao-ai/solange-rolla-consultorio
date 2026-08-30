-- Synthetic demonstration data only. Never replace these fixtures with real patient data.

-- Local-only staff fixture. The .invalid address can never receive external mail.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000', 'd9000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'demo.owner@solange.invalid', extensions.crypt('DemoLocalOnly!2026', extensions.gen_salt('bf')), now(),
  '', '', '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
values (
  'd9010000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001',
  'demo.owner@solange.invalid', '{"sub":"d9000000-0000-4000-8000-000000000001","email":"demo.owner@solange.invalid"}',
  'email', now(), now()
)
on conflict (provider_id, provider) do nothing;

insert into public.profiles (user_id, role, display_name, active)
values ('d9000000-0000-4000-8000-000000000001', 'psychologist_owner', 'Demonstração Local', true)
on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name, active = excluded.active;

insert into public.people (id, civil_name, preferred_name, birth_date, preferred_channel, fiscal_address)
values
  ('d0000000-0000-4000-8000-000000000001', 'Ana Demonstração', 'Ana', '1990-04-12', 'none', '{"city":"Belo Horizonte","label":"endereço sintético"}'),
  ('d0000000-0000-4000-8000-000000000002', 'Bruno Demonstração', 'Bruno', '1985-09-23', 'none', '{"city":"Belo Horizonte","label":"endereço sintético"}'),
  ('d0000000-0000-4000-8000-000000000003', 'Carla Demonstração', 'Carla', '1994-02-08', 'none', '{"city":"Belo Horizonte","label":"endereço sintético"}')
on conflict (id) do update set
  civil_name = excluded.civil_name,
  preferred_name = excluded.preferred_name,
  birth_date = excluded.birth_date,
  preferred_channel = excluded.preferred_channel,
  fiscal_address = excluded.fiscal_address;

insert into public.person_relationships (id, person_id, related_person_id, relationship_kind)
values ('d0100000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'financial_responsible')
on conflict (person_id, related_person_id, relationship_kind) do nothing;

insert into public.services (id, name, duration_minutes, price_cents, active)
values ('d0200000-0000-4000-8000-000000000001', 'Consulta individual', 50, 30000, true)
on conflict (id) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  active = excluded.active;

insert into public.legal_documents (id, key)
values ('d0250000-0000-4000-8000-000000000001', 'cancellation_policy')
on conflict (key) do nothing;

insert into public.legal_document_versions (
  id, document_id, version, content, content_hash_sha256, effective_from, is_draft
)
values (
  'd0260000-0000-4000-8000-000000000001', 'd0250000-0000-4000-8000-000000000001', 1,
  'Política sintética de demonstração: cancelamento sem cobrança até 48 horas computáveis antes da consulta; sábados e domingos não reduzem o prazo.',
  repeat('a', 64), '2026-01-01T00:00:00-03:00', false
)
on conflict (document_id, version) do nothing;

insert into public.cancellation_policies (
  id, policy_version, countable_hours, excluded_weekdays, business_timezone,
  late_cancellation_charge_enabled, no_show_charge_enabled, effective_from, legal_document_version_id
)
values (
  'd0300000-0000-4000-8000-000000000001', 1, 48, '[6,0]'::jsonb, 'America/Sao_Paulo',
  true, true, '2026-01-01T00:00:00-03:00', 'd0260000-0000-4000-8000-000000000001'
)
on conflict (policy_version) do update set
  countable_hours = excluded.countable_hours,
  excluded_weekdays = excluded.excluded_weekdays,
  business_timezone = excluded.business_timezone,
  late_cancellation_charge_enabled = excluded.late_cancellation_charge_enabled,
  no_show_charge_enabled = excluded.no_show_charge_enabled,
  legal_document_version_id = excluded.legal_document_version_id;

insert into public.appointments (
  id, person_id, service_id, starts_at, ends_at, status, policy_version,
  cancellation_deadline_at, business_timezone, cancellation_policy_snapshot
)
values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd0200000-0000-4000-8000-000000000001', '2026-08-31T15:00:00-03:00', '2026-08-31T15:50:00-03:00', 'confirmed', 1, '2026-08-27T15:00:00-03:00', 'America/Sao_Paulo', '{"policyVersion":1,"countableHours":48,"excludedWeekdays":[6,0]}'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'd0200000-0000-4000-8000-000000000001', '2026-09-01T14:00:00-03:00', '2026-09-01T14:50:00-03:00', 'pending_confirmation', 1, '2026-08-28T14:00:00-03:00', 'America/Sao_Paulo', '{"policyVersion":1,"countableHours":48,"excludedWeekdays":[6,0]}'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'd0200000-0000-4000-8000-000000000001', '2026-09-02T10:00:00-03:00', '2026-09-02T10:50:00-03:00', 'scheduled', 1, '2026-08-31T10:00:00-03:00', 'America/Sao_Paulo', '{"policyVersion":1,"countableHours":48,"excludedWeekdays":[6,0]}')
on conflict (id) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status,
  cancellation_deadline_at = excluded.cancellation_deadline_at,
  cancellation_policy_snapshot = excluded.cancellation_policy_snapshot;

insert into public.receivables (
  id, source_type, source_id, person_id, payer_person_id,
  original_amount_cents, idempotency_key, status
)
values
  ('d2000000-0000-4000-8000-000000000001', 'appointment', 'd1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 30000, 'demo-receivable-1', 'open'),
  ('d2000000-0000-4000-8000-000000000002', 'appointment', 'd1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 30000, 'demo-receivable-2', 'overdue'),
  ('d2000000-0000-4000-8000-000000000003', 'appointment', 'd1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 30000, 'demo-receivable-3', 'open')
on conflict (id) do update set
  original_amount_cents = excluded.original_amount_cents,
  status = excluded.status,
  payer_person_id = excluded.payer_person_id;

insert into public.events (
  id, title, description, type, starts_at, ends_at, timezone,
  location, modality, capacity, default_price_cents, status
)
values (
  'd3000000-0000-4000-8000-000000000001', 'Encontro Demonstração',
  'Evento sintético para apresentação do sistema.', 'group',
  '2026-09-12T09:00:00-03:00', '2026-09-12T12:00:00-03:00', 'America/Sao_Paulo',
  'Espaço Demonstração', 'in_person', 12, 18000, 'open'
)
on conflict (id) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status;

insert into public.event_registrations (id, event_id, person_id, price_cents, status, attendance_status)
values
  ('d3100000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 18000, 'confirmed', 'unknown'),
  ('d3100000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 18000, 'pending_payment', 'unknown')
on conflict (id) do update set status = excluded.status, price_cents = excluded.price_cents;

insert into public.fiscal_profiles (
  id, version, issuer_kind, issuer_document, municipality_code, service_code,
  tax_regime, fiscal_address, effective_from, active
)
values (
  'd3900000-0000-4000-8000-000000000001', 1, 'individual', 'DEMO-ONLY',
  '3106200', 'DEMO-SERVICE', 'demo', '{"label":"perfil fiscal sintético"}',
  '2026-01-01T00:00:00-03:00', true
)
on conflict (issuer_document, version) do nothing;

insert into public.fiscal_documents (
  id, source_type, source_id, person_id, payer_person_id, amount_cents,
  profile_id, profile_version, treatment_id, treatment_version, provider,
  idempotency_key, status, external_id, protocol, issued_at
)
select
  values_row.id, 'event_registration', values_row.source_id, values_row.person_id,
  values_row.person_id, 18000, 'd3900000-0000-4000-8000-000000000001', 1,
  treatment.id, treatment.version, 'mock', values_row.idempotency_key,
  values_row.status, values_row.external_id, values_row.protocol, values_row.issued_at
from (values
  ('d4000000-0000-4000-8000-000000000001'::uuid, 'd3100000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid, 'demo-fiscal-ready', 'ready', null::text, null::text, null::timestamptz),
  ('d4000000-0000-4000-8000-000000000002'::uuid, 'd3100000-0000-4000-8000-000000000002'::uuid, 'd0000000-0000-4000-8000-000000000002'::uuid, 'demo-fiscal-issued', 'issued', 'DEMO-NFSE-1', 'DEMO-PROTOCOL-1', '2026-08-29T12:00:00-03:00'::timestamptz)
) as values_row(id, source_id, person_id, idempotency_key, status, external_id, protocol, issued_at)
join public.fiscal_treatments treatment on treatment.source_kind = 'event_registration' and treatment.version = 1
on conflict (id) do nothing;
