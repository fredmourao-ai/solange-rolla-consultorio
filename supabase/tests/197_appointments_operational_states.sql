begin;

select plan(3);

select col_is_check('public', 'appointments', 'status', 'appointment status remains check constrained');

select like(
  pg_get_constraintdef(oid),
  '%checked_in%',
  'appointment status constraint accepts patient arrival state'
)
from pg_constraint
where conname = 'appointments_status_check'
  and conrelid = 'public.appointments'::regclass;

select like(
  pg_get_constraintdef(oid),
  '%in_progress%',
  'appointment status constraint accepts in-progress care state'
)
from pg_constraint
where conname = 'appointments_status_check'
  and conrelid = 'public.appointments'::regclass;

select * from finish();
rollback;
