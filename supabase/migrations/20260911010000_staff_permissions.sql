-- owners: identity
-- task-contract: docs/task-contracts/staff-permissions-113.json
-- allow-static-routines: true

create table public.permission_definitions (
  permission_key text primary key,
  area text not null,
  label text not null,
  clinical boolean not null default false,
  requires_aal2 boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table public.role_permission_defaults (
  role public.app_role not null,
  permission_key text not null references public.permission_definitions(permission_key) on delete restrict,
  allowed boolean not null,
  primary key (role, permission_key)
);

create table public.user_permission_overrides (
  user_id uuid not null references auth.users(id) on delete restrict,
  permission_key text not null references public.permission_definitions(permission_key) on delete restrict,
  allowed boolean not null,
  changed_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

insert into public.permission_definitions
  (permission_key, area, label, clinical, requires_aal2, sort_order)
values
  ('patients.read', 'patients', 'Visualizar pacientes', false, false, 10),
  ('patients.create', 'patients', 'Cadastrar pacientes', false, false, 20),
  ('patients.update', 'patients', 'Atualizar pacientes', false, false, 30),
  ('patients.archive', 'patients', 'Arquivar pacientes', false, false, 40),
  ('patients.relationships.manage', 'patients', 'Gerenciar vínculos de pacientes', false, false, 50),
  ('appointments.read', 'appointments', 'Visualizar agenda', false, false, 60),
  ('appointments.create', 'appointments', 'Criar consultas', false, false, 70),
  ('appointments.update', 'appointments', 'Atualizar consultas', false, false, 80),
  ('appointments.reschedule', 'appointments', 'Reagendar consultas', false, false, 90),
  ('appointments.cancel', 'appointments', 'Cancelar consultas', false, false, 100),
  ('appointments.confirm', 'appointments', 'Confirmar consultas', false, false, 110),
  ('appointments.checkin', 'appointments', 'Registrar chegada', false, false, 120),
  ('appointments.no_show', 'appointments', 'Registrar falta', false, false, 130),
  ('appointments.complete', 'appointments', 'Finalizar consultas', false, false, 140),
  ('appointments.blocks.manage', 'appointments', 'Gerenciar bloqueios da agenda', false, false, 150),
  ('clinical.read', 'clinical', 'Visualizar prontuário', true, true, 160),
  ('clinical.create', 'clinical', 'Criar registro clínico', true, true, 170),
  ('clinical.supersede', 'clinical', 'Corrigir registro clínico por nova versão', true, true, 180),
  ('clinical.attachments.manage', 'clinical', 'Gerenciar anexos clínicos', true, true, 190),
  ('clinical.documents.manage', 'clinical', 'Gerenciar documentos clínicos', true, true, 200),
  ('forms.read', 'forms', 'Visualizar formulários autorizados', false, false, 210),
  ('forms.send', 'forms', 'Enviar formulários', false, false, 220),
  ('forms.manage', 'forms', 'Gerenciar formulários', false, false, 230),
  ('documents.read', 'documents', 'Visualizar documentos autorizados', false, false, 240),
  ('documents.create', 'documents', 'Criar documentos administrativos', false, false, 250),
  ('documents.send', 'documents', 'Enviar documentos', false, false, 260),
  ('messaging.read', 'messaging', 'Visualizar comunicação administrativa', false, false, 270),
  ('messaging.send', 'messaging', 'Enviar comunicações', false, false, 280),
  ('messaging.templates.manage', 'messaging', 'Gerenciar modelos de mensagem', false, false, 290),
  ('finance.read', 'finance', 'Visualizar financeiro autorizado', false, false, 300),
  ('finance.receive', 'finance', 'Registrar recebimentos', false, false, 310),
  ('finance.adjust', 'finance', 'Ajustar lançamentos financeiros', false, false, 320),
  ('finance.refund', 'finance', 'Registrar estornos', false, true, 330),
  ('fiscal.read', 'fiscal', 'Visualizar dados fiscais autorizados', false, false, 340),
  ('fiscal.issue', 'fiscal', 'Emitir NFS-e', false, false, 350),
  ('fiscal.cancel', 'fiscal', 'Cancelar NFS-e', false, true, 360),
  ('events.read', 'events', 'Visualizar eventos', false, false, 370),
  ('events.manage', 'events', 'Gerenciar eventos', false, false, 380),
  ('reports.operational.read', 'reports', 'Visualizar relatórios operacionais', false, false, 390),
  ('reports.financial.read', 'reports', 'Visualizar relatórios financeiros', false, false, 400),
  ('reports.fiscal.read', 'reports', 'Visualizar relatórios fiscais', false, false, 410),
  ('users.read', 'users', 'Visualizar usuários', false, false, 420),
  ('users.manage', 'users', 'Gerenciar usuários', false, true, 430),
  ('permissions.manage', 'permissions', 'Gerenciar acessos', false, true, 440),
  ('settings.manage', 'settings', 'Gerenciar configurações', false, false, 450),
  ('audit.read', 'audit', 'Visualizar auditoria', false, true, 460);

insert into public.role_permission_defaults (role, permission_key, allowed)
select
  'psychologist_owner'::public.app_role,
  definition.permission_key,
  true
from public.permission_definitions as definition;

insert into public.role_permission_defaults (role, permission_key, allowed)
select
  'secretary'::public.app_role,
  definition.permission_key,
  definition.permission_key in (
      'patients.read',
      'patients.create',
      'patients.update',
      'patients.relationships.manage',
      'appointments.read',
      'appointments.create',
      'appointments.update',
      'appointments.reschedule',
      'appointments.cancel',
      'appointments.confirm',
      'appointments.checkin',
      'appointments.no_show',
      'appointments.blocks.manage',
      'forms.read',
      'forms.send',
      'documents.read',
      'documents.create',
      'documents.send',
      'messaging.read',
      'messaging.send',
      'finance.read',
      'finance.receive',
      'fiscal.read',
      'fiscal.issue',
      'events.read',
      'events.manage',
      'reports.operational.read'
    )
from public.permission_definitions as definition;

insert into public.role_permission_defaults (role, permission_key, allowed)
select
  'accounting'::public.app_role,
  definition.permission_key,
  definition.permission_key in (
      'documents.read',
      'finance.read',
      'fiscal.read',
      'reports.financial.read',
      'reports.fiscal.read'
    )
from public.permission_definitions as definition;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      case
        when (definition.permission_key like 'clinical.%' or definition.clinical)
          and profile.role <> 'psychologist_owner'::public.app_role then false
        when (definition.permission_key like 'clinical.%' or definition.clinical or definition.requires_aal2)
          and public.current_aal() is distinct from ('aal2') then false
        else coalesce(
          (
            select permission_override.allowed
            from public.user_permission_overrides as permission_override
            where permission_override.user_id = profile.user_id
              and permission_override.permission_key = definition.permission_key
          ),
          (
            select role_default.allowed
            from public.role_permission_defaults as role_default
            where role_default.role = profile.role
              and role_default.permission_key = definition.permission_key
          ),
          false
        )
      end
    from public.profiles as profile
    cross join public.permission_definitions as definition
    where definition.permission_key = p_permission_key
      and profile.user_id = auth.uid()
      and profile.active
    limit 1
  ), false)
$$;

create or replace function public.list_current_permissions()
returns table (permission_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select definition.permission_key
  from public.permission_definitions as definition
  where public.has_permission(definition.permission_key)
  order by definition.sort_order, definition.permission_key
$$;

alter table public.permission_definitions enable row level security;
alter table public.permission_definitions force row level security;
alter table public.role_permission_defaults enable row level security;
alter table public.role_permission_defaults force row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.user_permission_overrides force row level security;

create policy permission_definitions_staff_read
on public.permission_definitions
for select
to authenticated
using (public.current_app_role() is not null);

-- Runtime mutations remain unavailable until Task 4 audited RPCs.
create policy role_permission_defaults_owner_aal2
on public.role_permission_defaults
for select
to authenticated
using (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);

create policy user_permission_overrides_owner_aal2
on public.user_permission_overrides
for select
to authenticated
using (
  public.current_app_role() = 'psychologist_owner'
  and public.current_aal() = 'aal2'
);

revoke all on public.permission_definitions from public, anon, authenticated;
revoke all on public.role_permission_defaults from public, anon, authenticated;
revoke all on public.user_permission_overrides from public, anon, authenticated;
grant select on public.permission_definitions to authenticated;
grant select on public.role_permission_defaults to authenticated;
grant select on public.user_permission_overrides to authenticated;

revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.list_current_permissions() from public, anon;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.list_current_permissions() to authenticated;
