-- owners: appointments,forms
-- cross-module-task: docs/task-contracts/cancellation-legal-binding.json
-- allow-static-routines: true

-- Baseline operacional para ambientes criados apenas por migrations.
-- Mantém a regra provisória de homologação já aprovada como modelo editável:
-- 48 horas computáveis, sábado/domingo excluídos e cobrança tardia/no-show habilitada.
insert into public.legal_documents (key)
values ('cancellation_policy')
on conflict (key) do nothing;

insert into public.legal_document_versions (
  document_id,
  version,
  content,
  content_hash_sha256,
  effective_from,
  is_draft
)
select
  d.id,
  1,
  'Modelo provisório para homologação: cancelamento sem cobrança com antecedência mínima de 48 horas computáveis. Sábados e domingos contam zero hora. Cancelamento fora do prazo e falta/no-show podem gerar cobrança conforme a regra vigente. Este texto deverá ser revisado e aprovado pela cliente antes da produção definitiva.',
  '353ca9e0006c4e7a301c13378d61b729e5b06556ae6d3f3733fb38368e78a8c3',
  '2026-01-01T00:00:00Z'::timestamptz,
  false
from public.legal_documents as d
where d.key = 'cancellation_policy'
  and not exists (
    select 1
    from public.legal_document_versions as existing
    where existing.document_id = d.id
      and existing.version = 1
  );

insert into public.cancellation_policies (
  policy_version,
  countable_hours,
  excluded_weekdays,
  business_timezone,
  late_cancellation_charge_enabled,
  no_show_charge_enabled,
  effective_from,
  legal_document_version_id
)
select
  1,
  48,
  '[6,0]'::jsonb,
  'America/Sao_Paulo',
  true,
  true,
  '2026-01-01T00:00:00Z'::timestamptz,
  v.id
from public.legal_documents as d
join public.legal_document_versions as v
  on v.document_id = d.id
 and v.version = 1
where d.key = 'cancellation_policy'
  and not exists (
    select 1
    from public.cancellation_policies as existing
    where existing.policy_version = 1
  );
