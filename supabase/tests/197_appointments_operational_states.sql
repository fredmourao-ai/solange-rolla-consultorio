begin;

select plan(3);

select ok(
  exists(
    select 1
    from pg_constraint
    where conname = 'appointments_status_check'
      and conrelid = 'public.appointments'::regclass
      and contype = 'c'
  ),
  'appointment status remains check constrained'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conname = 'appointments_status_check'
      and conrelid = 'public.appointments'::regclass
      and pg_get_constraintdef(oid) like '%checked_in%'
  ),
  'appointment status constraint accepts patient arrival state'
);

select ok(
  exists(
    select 1
    from pg_constraint
    where conname = 'appointments_status_check'
      and conrelid = 'public.appointments'::regclass
      and pg_get_constraintdef(oid) like '%in_progress%'
  ),
  'appointment status constraint accepts in-progress care state'
);

select * from finish();
rollback;
