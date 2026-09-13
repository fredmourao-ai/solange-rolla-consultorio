-- owners: appointments,identity,people
-- cross-module-task: docs/task-contracts/collaboration-tasks-onda4.json
-- allow-static-routines: true

insert into public.permission_definitions
  (permission_key, area, label, clinical, requires_aal2, sort_order)
values
  ('tasks.read', 'tasks', 'Visualizar tarefas administrativas', false, false, 470),
  ('tasks.create', 'tasks', 'Criar tarefas administrativas', false, false, 480),
  ('tasks.update', 'tasks', 'Atualizar tarefas administrativas', false, false, 490),
  ('tasks.assign', 'tasks', 'Atribuir tarefas administrativas', false, false, 500);

insert into public.role_permission_defaults (role, permission_key, allowed)
select 'psychologist_owner'::public.app_role, definition.permission_key, true
from public.permission_definitions as definition
where definition.permission_key in ('tasks.read', 'tasks.create', 'tasks.update', 'tasks.assign');

insert into public.role_permission_defaults (role, permission_key, allowed)
select 'secretary'::public.app_role, definition.permission_key, true
from public.permission_definitions as definition
where definition.permission_key in ('tasks.read', 'tasks.create', 'tasks.update', 'tasks.assign');

insert into public.role_permission_defaults (role, permission_key, allowed)
select 'accounting'::public.app_role, definition.permission_key, false
from public.permission_definitions as definition
where definition.permission_key in ('tasks.read', 'tasks.create', 'tasks.update', 'tasks.assign');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'schedule_follow_up', 'contact_patient', 'resend_form',
    'collect_payment', 'review_document', 'other_admin'
  )),
  title text not null check (char_length(trim(title)) between 1 and 140),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  person_id uuid references public.people(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  assigned_to_user_id uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tasks_assigned_to_open_idx on public.tasks (assigned_to_user_id) where status in ('open', 'in_progress');
create index tasks_person_idx on public.tasks (person_id) where person_id is not null;
create index tasks_appointment_idx on public.tasks (appointment_id) where appointment_id is not null;

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

create policy tasks_select_authorized
on public.tasks
for select
to authenticated
using (public.has_permission('tasks.read'));

create policy tasks_insert_authorized
on public.tasks
for insert
to authenticated
with check (
  public.has_permission('tasks.create')
  and created_by_user_id = auth.uid()
);

create policy tasks_update_authorized
on public.tasks
for update
to authenticated
using (public.has_permission('tasks.update'))
with check (public.has_permission('tasks.update'));

revoke all on public.tasks from public, anon, authenticated;
grant select, insert, update on public.tasks to authenticated;
