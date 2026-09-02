import process from 'node:process'
import { pathToFileURL } from 'node:url'

const API_BASE = 'https://api.supabase.com/v1/projects'

export function buildSecuritySmokeQuery() {
  return `begin;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', 'authenticated', 'authenticated', 'staging-secretary@example.test', 'synthetic-password', now(), '{}', '{}'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff4', 'authenticated', 'authenticated', 'staging-accounting@example.test', 'synthetic-password', now(), '{}', '{}');
insert into public.profiles (user_id, role, display_name)
values
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', 'secretary', 'Staging Secretary'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff4', 'accounting', 'Staging Accounting');
insert into public.people (id, civil_name, birth_date, cpf_normalized, fiscal_address)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'Staging RLS Smoke', '1990-01-01', null, '{"city":"Teste"}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-ffff-ffff-fffffffffff3","aal":"aal2","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.accounting_people_view) <> 0 then
    raise exception 'no-profile authenticated subject can read accounting view';
  end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-ffff-ffff-fffffffffff4","aal":"aal2","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.people) <> 0 then
    raise exception 'accounting can read people directly';
  end if;
  if (select count(*) from public.accounting_people_view where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1') <> 1 then
    raise exception 'accounting cannot read minimum accounting view';
  end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-ffff-ffff-fffffffffff2","aal":"aal2","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.accounting_people_view) <> 0 then
    raise exception 'secretary can read accounting-only view';
  end if;
end $$;
reset role;
rollback;`
}

async function runSecuritySmoke({ projectRef, accessToken, fetchImpl = fetch }) {
  const response = await fetchImpl(`${API_BASE}/${projectRef}/database/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: buildSecuritySmokeQuery(), read_only: false }),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`staging accounting RLS smoke failed (${response.status}): ${text || 'empty response'}`)
  }
  return text
}

async function main() {
  const projectRef = process.env.SUPABASE_STAGING_PROJECT_REF
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!projectRef) throw new Error('SUPABASE_STAGING_PROJECT_REF is required')
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required')

  await runSecuritySmoke({ projectRef, accessToken })
  console.log('staging accounting RLS security smoke passed')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
