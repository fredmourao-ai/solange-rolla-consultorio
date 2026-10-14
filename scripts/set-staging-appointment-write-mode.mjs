import process from 'node:process'
import { pathToFileURL } from 'node:url'

const API_BASE = 'https://api.supabase.com/v1/projects'
const MODES = new Set(['legacy-compatible', 'atomic-only'])

function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function asBoolean(value) {
  return value === true || value === 'true' || value === 't'
}

async function runQuery({ projectRef, accessToken, query, fetchImpl, readOnly = false }) {
  const response = await fetchImpl(`${API_BASE}/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, read_only: readOnly }),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`Supabase Management API ${response.status}`)
  return payload
}

export function writeModeSql(mode) {
  if (!MODES.has(mode)) throw new Error('invalid appointment write mode')
  if (mode === 'legacy-compatible') {
    return [
      'grant insert, update on public.appointments to authenticated;',
      'grant insert on public.appointment_status_history to authenticated;',
    ].join('\n')
  }
  return [
    'revoke insert, update, delete on public.appointments from authenticated;',
    'revoke insert, update, delete on public.appointment_status_history from authenticated;',
  ].join('\n')
}

const verificationSql = [
  "select has_table_privilege('authenticated','public.appointments','INSERT') as appointments_insert,",
  "       has_table_privilege('authenticated','public.appointments','UPDATE') as appointments_update,",
  "       has_table_privilege('authenticated','public.appointments','DELETE') as appointments_delete,",
  "       has_table_privilege('authenticated','public.appointment_status_history','INSERT') as history_insert,",
  "       has_table_privilege('authenticated','public.appointment_status_history','UPDATE') as history_update,",
  "       has_table_privilege('authenticated','public.appointment_status_history','DELETE') as history_delete",
].join('\n')

export async function setStagingAppointmentWriteMode({
  projectRef,
  productionRef,
  accessToken,
  mode,
  fetchImpl = fetch,
}) {
  if (!projectRef) throw new Error('SUPABASE_STAGING_PROJECT_REF is required')
  if (!productionRef) throw new Error('SUPABASE_PRODUCTION_PROJECT_REF is required')
  if (projectRef === productionRef) throw new Error('refusing appointment write-mode change against production')
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required')
  if (!MODES.has(mode)) throw new Error('invalid appointment write mode')

  await runQuery({ projectRef, accessToken, query: writeModeSql(mode), fetchImpl })
  const rows = rowsFromPayload(await runQuery({
    projectRef,
    accessToken,
    query: verificationSql,
    fetchImpl,
    readOnly: true,
  }))
  const row = rows[0]
  if (!row) throw new Error('appointment write-mode verification returned no row')

  const actual = {
    appointmentsInsert: asBoolean(row.appointments_insert),
    appointmentsUpdate: asBoolean(row.appointments_update),
    appointmentsDelete: asBoolean(row.appointments_delete),
    historyInsert: asBoolean(row.history_insert),
    historyUpdate: asBoolean(row.history_update),
    historyDelete: asBoolean(row.history_delete),
  }
  const expected = mode === 'legacy-compatible'
    ? {
        appointmentsInsert: true,
        appointmentsUpdate: true,
        appointmentsDelete: false,
        historyInsert: true,
        historyUpdate: false,
        historyDelete: false,
      }
    : {
        appointmentsInsert: false,
        appointmentsUpdate: false,
        appointmentsDelete: false,
        historyInsert: false,
        historyUpdate: false,
        historyDelete: false,
      }

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`appointment write-mode verification failed for ${mode}`)
  }
  return actual
}

async function main() {
  const mode = process.argv[2]
  const result = await setStagingAppointmentWriteMode({
    projectRef: process.env.SUPABASE_STAGING_PROJECT_REF,
    productionRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    mode,
  })
  console.log(`staging appointment write mode=${mode} verified=${Object.values(result).every((value) => typeof value === 'boolean')}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
