import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

if (process.env.APP_ENV !== 'staging') {
  throw new Error('STAGING_CANCELLATION_BOOTSTRAP_FORBIDDEN')
}

const envFile = process.env.STAGING_RUNTIME_ENV_FILE
if (!envFile) throw new Error('STAGING_RUNTIME_ENV_FILE_REQUIRED')

const values = {}
for (const raw of readFileSync(envFile, 'utf8').split(/\r?\n/u)) {
  const line = raw.trim()
  if (!line || line.startsWith('#') || !line.includes('=')) continue
  const [key, ...rest] = line.split('=')
  values[key] = rest.join('=')
}

const dbUrl = values.DB_URL
if (!dbUrl) throw new Error('STAGING_DB_URL_REQUIRED')
const parsed = new URL(dbUrl)
if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('STAGING_DB_URL_INVALID')

const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
if (!parsed.hostname || !database || !parsed.username) throw new Error('STAGING_DB_URL_INVALID')
const pgEnv = {
  ...process.env,
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || '5432',
  PGDATABASE: database,
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  PGCONNECT_TIMEOUT: '8',
  PGOPTIONS: '-c statement_timeout=8000 -c lock_timeout=4000',
}
const sslmode = parsed.searchParams.get('sslmode')
if (sslmode) pgEnv.PGSSLMODE = sslmode

const sql = String.raw`
begin;
insert into public.legal_documents (id, key)
values ('d0250000-0000-4000-8000-000000000001', 'cancellation_policy')
on conflict (key) do nothing;

insert into public.legal_document_versions (
  id, document_id, version, content, content_hash_sha256, effective_from, is_draft
)
select 'd0260000-0000-4000-8000-000000000001', d.id, 1,
  'Modelo provisório de homologação; revisão jurídica obrigatória antes da produção.',
  repeat('b', 64), '2026-01-01T00:00:00-03:00'::timestamptz, true
from public.legal_documents d
where d.key = 'cancellation_policy'
on conflict (document_id, version) do nothing;

insert into public.cancellation_policies (
  id, policy_version, countable_hours, excluded_weekdays, business_timezone,
  late_cancellation_charge_enabled, no_show_charge_enabled, effective_from,
  legal_document_version_id
)
select 'd0300000-0000-4000-8000-000000000001', 1, 48, '[6,0]'::jsonb,
  'America/Sao_Paulo', true, true, '2026-01-01T00:00:00-03:00'::timestamptz, v.id
from public.legal_documents d
join public.legal_document_versions v on v.document_id = d.id and v.version = 1
where d.key = 'cancellation_policy'
on conflict (policy_version) do nothing;
commit;
`

try {
  execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
    env: pgEnv,
    timeout: 20_000,
    stdio: ['ignore', 'ignore', 'pipe'],
  })
} catch {
  throw new Error('STAGING_CANCELLATION_BOOTSTRAP_FAILED')
}

console.log('staging cancellation policy bootstrap ready')
