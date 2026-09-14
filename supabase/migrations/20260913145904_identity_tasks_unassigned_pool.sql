-- owners: identity
-- task-contract: docs/task-contracts/identity-tasks-unassigned-pool.json
-- allow-static-routines: true

-- Onda 4 Task 4 (dashboard da Secretaria) needs a genuine "sem responsável"
-- bucket: a task anyone with tasks.update can claim. assigned_to_user_id was
-- NOT NULL, so there was no way to represent that state.

alter table public.tasks alter column assigned_to_user_id drop not null;

drop index tasks_assigned_to_open_idx;
create index tasks_assigned_to_open_idx on public.tasks (assigned_to_user_id) where status in ('open', 'in_progress');

drop policy tasks_update_authorized on public.tasks;

-- Symmetric with tasks_insert_authorized: reassigning a task to someone
-- other than yourself requires tasks.assign; claiming an unassigned task for
-- yourself, releasing a task back to the pool (NULL), or updating a task
-- already assigned to you (e.g. completing it) only needs tasks.update.
create policy tasks_update_authorized
on public.tasks
for update
to authenticated
using (public.has_permission('tasks.update'))
with check (
  public.has_permission('tasks.update')
  and (
    assigned_to_user_id is null
    or assigned_to_user_id = auth.uid()
    or public.has_permission('tasks.assign')
  )
);
