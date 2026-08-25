begin;
select plan(1);
select ok(current_setting('server_version_num')::int > 0, 'postgres is running');
select * from finish();
rollback;
