-- owners: appointments
-- task-contract: docs/task-contracts/appointments-legacy-snapshot-compat-259.json
-- allow-static-routines: true

create or replace function public.appointment_cancellation_deadline_from_snapshot(
  p_starts_at timestamptz,
  p_snapshot jsonb
)
returns timestamptz
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_policy_version integer;
  v_countable_hours integer;
  v_excluded_weekdays jsonb;
  v_timezone text;
  v_local_start timestamp;
  v_candidate_date date;
  v_remaining_days integer;
  v_consumed_days integer := 0;
  v_weekday integer;
  v_index integer;
begin
  if coalesce(jsonb_typeof(p_snapshot), '') <> 'object'
    or coalesce(jsonb_typeof(p_snapshot -> 'policyVersion'), '') <> 'number'
    or coalesce(jsonb_typeof(p_snapshot -> 'countableHours'), '') <> 'number'
    or coalesce(jsonb_typeof(p_snapshot -> 'excludedWeekdays'), '') <> 'array' then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;
  v_policy_version := (p_snapshot ->> 'policyVersion')::integer;

  if (p_snapshot ? 'businessTimezone'
      and coalesce(jsonb_typeof(p_snapshot -> 'businessTimezone'), '') <> 'string')
    or (p_snapshot ? 'lateCancellationChargeEnabled'
      and coalesce(jsonb_typeof(p_snapshot -> 'lateCancellationChargeEnabled'), '') <> 'boolean')
    or (p_snapshot ? 'noShowChargeEnabled'
      and coalesce(jsonb_typeof(p_snapshot -> 'noShowChargeEnabled'), '') <> 'boolean')
    or (
      v_policy_version <> 1
      and (
        not p_snapshot ? 'businessTimezone'
        or not p_snapshot ? 'lateCancellationChargeEnabled'
        or not p_snapshot ? 'noShowChargeEnabled'
      )
    ) then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;

  v_countable_hours := (p_snapshot ->> 'countableHours')::integer;
  v_excluded_weekdays := p_snapshot -> 'excludedWeekdays';
  v_timezone := coalesce(
    p_snapshot ->> 'businessTimezone',
    case when v_policy_version = 1 then 'America/Sao_Paulo' else null end
  );

  if v_countable_hours <= 0
    or v_countable_hours > 8760
    or mod(v_countable_hours, 24) <> 0
    or jsonb_array_length(v_excluded_weekdays) = 0
    or v_timezone <> 'America/Sao_Paulo' then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;
  for v_index in 0..jsonb_array_length(v_excluded_weekdays) - 1 loop
    if coalesce(jsonb_typeof(v_excluded_weekdays -> v_index), '') <> 'number'
      or (v_excluded_weekdays ->> v_index)::integer not between 0 and 6 then
      raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
    end if;
  end loop;

  if not exists (
    select 1
    from (values (0), (1), (2), (3), (4), (5), (6)) as weekday(value)
    where not (v_excluded_weekdays @> jsonb_build_array(weekday.value))
  ) then
    raise exception 'AGENDA_POLICY_SNAPSHOT_INVALID' using errcode = '23514';
  end if;

  v_local_start := p_starts_at at time zone v_timezone;
  v_candidate_date := v_local_start::date;
  v_remaining_days := v_countable_hours / 24;

  while v_consumed_days < v_remaining_days loop
    v_candidate_date := v_candidate_date - 1;
    v_weekday := date_part('dow', v_candidate_date)::integer;
    if not (v_excluded_weekdays @> jsonb_build_array(v_weekday)) then
      v_consumed_days := v_consumed_days + 1;
    end if;
  end loop;

  return (v_candidate_date + v_local_start::time) at time zone v_timezone;
end;
$$;

revoke all on function public.appointment_cancellation_deadline_from_snapshot(timestamptz, jsonb)
from public, anon;
grant execute on function public.appointment_cancellation_deadline_from_snapshot(timestamptz, jsonb)
to authenticated;
