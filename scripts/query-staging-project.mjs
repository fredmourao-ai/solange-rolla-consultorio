const API_BASE = 'https://api.supabase.com/v1/projects'

export async function queryStagingProject({ projectRef, accessToken, query, fetchImpl = fetch, readOnly = true }) {
  if (!projectRef) throw new Error('SUPABASE_STAGING_PROJECT_REF_REQUIRED')
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED')
  if (!query?.trim()) throw new Error('STAGING_QUERY_REQUIRED')
  const response = await fetchImpl(`${API_BASE}/${projectRef}/database/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, read_only: readOnly }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`SUPABASE_MANAGEMENT_QUERY_FAILED:${response.status}:${text || 'empty'}`)
  if (!text) return []
  const payload = JSON.parse(text)
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export function scalarFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return ''
  const row = rows[0]
  if (!row || typeof row !== 'object') return String(row ?? '')
  const values = Object.values(row)
  return values.length ? String(values[0] ?? '') : ''
}
