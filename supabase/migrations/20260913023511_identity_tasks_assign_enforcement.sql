-- owners: identity
-- task-contract: docs/task-contracts/identity-tasks-assign-enforcement.json
-- allow-static-routines: true

-- The tasks.assign permission exists since the collaboration tasks
-- migration but was never enforced: tasks_insert_authorized only checked
-- tasks.create, so any actor with tasks.create could assign a task to any
-- other user. Cross-assigning (assigning to someone other than yourself)
-- now additionally requires tasks.assign; self-assignment is unaffected.

drop policy tasks_insert_authorized on public.tasks;

create policy tasks_insert_authorized
on public.tasks
for insert
to authenticated
with check (
  public.has_permission('tasks.create')
  and created_by_user_id = auth.uid()
  and (assigned_to_user_id = auth.uid() or public.has_permission('tasks.assign'))
);
