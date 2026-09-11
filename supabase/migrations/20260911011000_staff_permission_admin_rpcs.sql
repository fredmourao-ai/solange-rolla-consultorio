-- owners: identity, audit
-- task-contract: docs/task-contracts/staff-permission-admin-113.json
-- allow-static-routines: true

create or replace function public.list_staff_users()
returns table (
  user_id uuid,
  display_name text,
  role public.app_role,
  active boolean,
  email text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_permission('users.read')
    or public.has_permission('permissions.manage')
  ) then
    raise exception 'PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    profile.user_id,
    profile.display_name,
    profile.role,
    profile.active,
    account.email::text,
    account.last_sign_in_at,
    profile.created_at,
    profile.updated_at
  from public.profiles as profile
  join auth.users as account on account.id = profile.user_id
  order by profile.active desc, lower(profile.display_name), profile.user_id;
end;
$$;

create or replace function public.list_user_access(p_user_id uuid)
returns table (
  permission_key text,
  area text,
  label text,
  clinical boolean,
  requires_aal2 boolean,
  sort_order integer,
  role_default boolean,
  override_allowed boolean,
  effective_allowed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
begin
  if not public.has_permission('permissions.manage') then
    raise exception 'PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  select profile.role
  into target_role
  from public.profiles as profile
  where profile.user_id = p_user_id;

  if target_role is null then
    raise exception 'STAFF_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  return query
  select
    definition.permission_key,
    definition.area,
    definition.label,
    definition.clinical,
    definition.requires_aal2,
    definition.sort_order,
    coalesce(role_default.allowed, false) as role_default,
    permission_override.allowed as override_allowed,
    case
      when (definition.clinical or definition.permission_key like 'clinical.%')
        and target_role <> 'psychologist_owner'::public.app_role then false
      else coalesce(permission_override.allowed, role_default.allowed, false)
    end as effective_allowed
  from public.permission_definitions as definition
  left join public.role_permission_defaults as role_default
    on role_default.role = target_role
   and role_default.permission_key = definition.permission_key
  left join public.user_permission_overrides as permission_override
    on permission_override.user_id = p_user_id
   and permission_override.permission_key = definition.permission_key
  order by definition.sort_order, definition.permission_key;
end;
$$;

create or replace function public.set_user_permission_override(
  p_user_id uuid,
  p_permission_key text,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  definition_clinical boolean;
  previous_override boolean;
  another_owner_available boolean;
begin
  if not public.has_permission('permissions.manage') then
    raise exception 'PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  select profile.role
  into target_role
  from public.profiles as profile
  where profile.user_id = p_user_id;

  if target_role is null then
    raise exception 'STAFF_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select (definition.clinical or definition.permission_key like 'clinical.%')
  into definition_clinical
  from public.permission_definitions as definition
  where definition.permission_key = p_permission_key;

  if definition_clinical is null then
    raise exception 'UNKNOWN_PERMISSION' using errcode = '22023';
  end if;

  if p_allowed and definition_clinical and target_role <> 'psychologist_owner'::public.app_role then
    raise exception 'CLINICAL_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if p_user_id = auth.uid()
    and p_permission_key = 'permissions.manage'
    and not p_allowed then
    select exists (
      select 1
      from public.profiles as profile
      join public.role_permission_defaults as role_default
        on role_default.role = profile.role
       and role_default.permission_key = 'permissions.manage'
      left join public.user_permission_overrides as permission_override
        on permission_override.user_id = profile.user_id
       and permission_override.permission_key = 'permissions.manage'
      where profile.user_id <> auth.uid()
        and profile.role = 'psychologist_owner'::public.app_role
        and profile.active
        and coalesce(permission_override.allowed, role_default.allowed, false)
    ) into another_owner_available;

    if not another_owner_available then
      raise exception 'LAST_ACCESS_ADMIN_REQUIRED' using errcode = '23514';
    end if;
  end if;

  select permission_override.allowed
  into previous_override
  from public.user_permission_overrides as permission_override
  where permission_override.user_id = p_user_id
    and permission_override.permission_key = p_permission_key;

  insert into public.user_permission_overrides (
    user_id,
    permission_key,
    allowed,
    changed_by_user_id,
    updated_at
  )
  values (p_user_id, p_permission_key, p_allowed, auth.uid(), now())
  on conflict (user_id, permission_key)
  do update set
    allowed = excluded.allowed,
    changed_by_user_id = auth.uid(),
    updated_at = now();

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    auth.uid(),
    'staff_permission.override_set',
    'staff_user',
    p_user_id,
    concat('staff-permission:', p_user_id::text, ':', p_permission_key),
    jsonb_build_object(
      'permissionKey', p_permission_key,
      'previousOverride', previous_override,
      'newOverride', p_allowed,
      'targetRole', target_role::text
    )
  );
end;
$$;

create or replace function public.clear_user_permission_override(
  p_user_id uuid,
  p_permission_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  previous_override boolean;
begin
  if not public.has_permission('permissions.manage') then
    raise exception 'PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  select profile.role
  into target_role
  from public.profiles as profile
  where profile.user_id = p_user_id;

  if target_role is null then
    raise exception 'STAFF_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.permission_definitions as definition
    where definition.permission_key = p_permission_key
  ) then
    raise exception 'UNKNOWN_PERMISSION' using errcode = '22023';
  end if;

  select permission_override.allowed
  into previous_override
  from public.user_permission_overrides as permission_override
  where permission_override.user_id = p_user_id
    and permission_override.permission_key = p_permission_key;

  delete from public.user_permission_overrides as permission_override
  where permission_override.user_id = p_user_id
    and permission_override.permission_key = p_permission_key;

  if found then
    insert into public.audit_events (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      correlation_id,
      metadata
    ) values (
      auth.uid(),
      'staff_permission.override_cleared',
      'staff_user',
      p_user_id,
      concat('staff-permission:', p_user_id::text, ':', p_permission_key),
      jsonb_build_object(
        'permissionKey', p_permission_key,
        'previousOverride', previous_override,
        'newOverride', null,
        'targetRole', target_role::text
      )
    );
  end if;
end;
$$;

create or replace function public.upsert_staff_profile(
  p_user_id uuid,
  p_display_name text,
  p_role public.app_role,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_role public.app_role;
  previous_active boolean;
  profile_exists boolean;
  another_owner_available boolean;
begin
  if not public.has_permission('users.manage') then
    raise exception 'PERMISSION_FORBIDDEN' using errcode = '42501';
  end if;

  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 160 then
    raise exception 'INVALID_DISPLAY_NAME' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users as account where account.id = p_user_id) then
    raise exception 'AUTH_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select true, profile.role, profile.active
  into profile_exists, previous_role, previous_active
  from public.profiles as profile
  where profile.user_id = p_user_id;

  profile_exists := coalesce(profile_exists, false);

  if p_role = 'psychologist_owner'::public.app_role
    and public.current_app_role() <> 'psychologist_owner'::public.app_role then
    raise exception 'OWNER_ROLE_ASSIGNMENT_FORBIDDEN' using errcode = '42501';
  end if;

  if profile_exists
    and previous_role = 'psychologist_owner'::public.app_role
    and previous_active
    and (p_role <> 'psychologist_owner'::public.app_role or not p_active) then
    select exists (
      select 1
      from public.profiles as profile
      join public.role_permission_defaults as role_default
        on role_default.role = profile.role
       and role_default.permission_key = 'permissions.manage'
      left join public.user_permission_overrides as permission_override
        on permission_override.user_id = profile.user_id
       and permission_override.permission_key = 'permissions.manage'
      where profile.user_id <> p_user_id
        and profile.role = 'psychologist_owner'::public.app_role
        and profile.active
        and coalesce(permission_override.allowed, role_default.allowed, false)
    ) into another_owner_available;

    if not another_owner_available then
      raise exception 'LAST_OWNER_REQUIRED' using errcode = '23514';
    end if;
  end if;

  insert into public.profiles (user_id, role, display_name, active)
  values (p_user_id, p_role, btrim(p_display_name), p_active)
  on conflict (user_id)
  do update set
    role = excluded.role,
    display_name = excluded.display_name,
    active = excluded.active;

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    correlation_id,
    metadata
  ) values (
    auth.uid(),
    case when profile_exists then 'staff_profile.updated' else 'staff_profile.created' end,
    'staff_user',
    p_user_id,
    concat('staff-profile:', p_user_id::text),
    jsonb_build_object(
      'previousRole', previous_role::text,
      'newRole', p_role::text,
      'previousActive', previous_active,
      'newActive', p_active
    )
  );
end;
$$;

revoke insert, update, delete on public.profiles from authenticated;

revoke all on function public.list_staff_users() from public, anon, authenticated;
revoke all on function public.list_user_access(uuid) from public, anon, authenticated;
revoke all on function public.set_user_permission_override(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.clear_user_permission_override(uuid, text) from public, anon, authenticated;
revoke all on function public.upsert_staff_profile(uuid, text, public.app_role, boolean) from public, anon, authenticated;

grant execute on function public.list_staff_users() to authenticated;
grant execute on function public.list_user_access(uuid) to authenticated;
grant execute on function public.set_user_permission_override(uuid, text, boolean) to authenticated;
grant execute on function public.clear_user_permission_override(uuid, text) to authenticated;
grant execute on function public.upsert_staff_profile(uuid, text, public.app_role, boolean) to authenticated;
