create extension if not exists pgmq;

do $$
declare
  v_queue_name text;
begin
  foreach v_queue_name in array array['messaging', 'automations', 'documents', 'fiscal']::text[] loop
    if not exists (
      select 1
      from pgmq.list_queues() as queues
      where queues.queue_name = v_queue_name
    ) then
      perform pgmq.create(v_queue_name);
    end if;
  end loop;
end;
$$;

-- PGMQ is a server-side implementation detail. Do not expose its schema or
-- queue tables/functions directly to API roles; workers go through the narrow
-- SECURITY DEFINER functions below.
revoke all on schema pgmq from public, anon, authenticated, service_role;
revoke all on all tables in schema pgmq from public, anon, authenticated, service_role;
revoke all on all sequences in schema pgmq from public, anon, authenticated, service_role;
revoke all on all routines in schema pgmq from public, anon, authenticated, service_role;

create or replace function public.queue_send(
  p_queue_name text,
  p_message jsonb,
  p_delay_seconds integer default 0
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message_id bigint;
begin
  if not (p_queue_name = any (array['messaging', 'automations', 'documents', 'fiscal']::text[])) then
    raise exception 'unsupported queue: %', p_queue_name using errcode = '22023';
  end if;

  if p_delay_seconds < 0 then
    raise exception 'delay must be non-negative' using errcode = '22023';
  end if;

  if jsonb_typeof(p_message) is distinct from 'object'
    or coalesce(p_message ->> 'kind', '') = ''
    or coalesce(p_message ->> 'idempotencyKey', '') = ''
    or coalesce(p_message ->> 'correlationId', '') = ''
    or coalesce(p_message ->> 'createdAt', '') = ''
    or not (p_message ? 'payload') then
    raise exception 'queue message envelope is invalid' using errcode = '22023';
  end if;

  select *
  into strict v_message_id
  from pgmq.send(p_queue_name, p_message, p_delay_seconds);

  return v_message_id::text;
end;
$$;

create or replace function public.queue_read(
  p_queue_name text,
  p_visibility_timeout_seconds integer,
  p_quantity integer
)
returns table (
  id text,
  read_count bigint,
  enqueued_at timestamptz,
  visible_at timestamptz,
  message jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (p_queue_name = any (array['messaging', 'automations', 'documents', 'fiscal']::text[])) then
    raise exception 'unsupported queue: %', p_queue_name using errcode = '22023';
  end if;

  if p_visibility_timeout_seconds < 0 then
    raise exception 'visibility timeout must be non-negative' using errcode = '22023';
  end if;

  if p_quantity <= 0 then
    raise exception 'quantity must be positive' using errcode = '22023';
  end if;

  return query
  select
    queued.msg_id::text,
    queued.read_ct,
    queued.enqueued_at,
    queued.vt,
    queued.message
  from pgmq.read(p_queue_name, p_visibility_timeout_seconds, p_quantity) as queued;
end;
$$;

create or replace function public.queue_archive(
  p_queue_name text,
  p_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archived boolean;
begin
  if not (p_queue_name = any (array['messaging', 'automations', 'documents', 'fiscal']::text[])) then
    raise exception 'unsupported queue: %', p_queue_name using errcode = '22023';
  end if;

  select pgmq.archive(p_queue_name, p_message_id::bigint)
  into v_archived;

  return coalesce(v_archived, false);
end;
$$;

create or replace function public.queue_requeue(
  p_queue_name text,
  p_message_id text,
  p_delay_seconds integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (p_queue_name = any (array['messaging', 'automations', 'documents', 'fiscal']::text[])) then
    raise exception 'unsupported queue: %', p_queue_name using errcode = '22023';
  end if;

  if p_delay_seconds < 0 then
    raise exception 'delay must be non-negative' using errcode = '22023';
  end if;

  perform pgmq.set_vt(p_queue_name, p_message_id::bigint, p_delay_seconds);
  return found;
end;
$$;

revoke all on function public.queue_send(text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.queue_read(text, integer, integer) from public, anon, authenticated;
revoke all on function public.queue_archive(text, text) from public, anon, authenticated;
revoke all on function public.queue_requeue(text, text, integer) from public, anon, authenticated;

grant execute on function public.queue_send(text, jsonb, integer) to service_role;
grant execute on function public.queue_read(text, integer, integer) to service_role;
grant execute on function public.queue_archive(text, text) to service_role;
grant execute on function public.queue_requeue(text, text, integer) to service_role;
