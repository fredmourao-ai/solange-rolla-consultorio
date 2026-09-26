const API_BASE = 'https://api.supabase.com/v1/projects'

export function selectLatestCompletedBackup(payload) {
  const completed = Array.isArray(payload?.backups)
    ? payload.backups.filter((backup) => String(backup?.status ?? '').toUpperCase() === 'COMPLETED')
    : []
  const candidates = completed
    .map((backup) => ({
      at: Date.parse(String(backup?.inserted_at ?? '')),
      physical: Boolean(backup?.is_physical_backup),
    }))
    .filter((entry) => Number.isFinite(entry.at))

  const physicalUnix = Number(payload?.physical_backup_data?.latest_physical_backup_date_unix)
  if (Number.isFinite(physicalUnix) && physicalUnix > 0) {
    candidates.push({ at: physicalUnix * 1000, physical: true })
  }
  return candidates.sort((a, b) => b.at - a.at)[0] ?? null
}

export async function checkManagedStagingBackup({
  runtimeProjectRef,
  stagingProjectRef,
  accessToken,
  maxAgeSeconds = 90_000,
  now = Date.now(),
  fetchImpl = fetch,
}) {
  if (!runtimeProjectRef || !stagingProjectRef) throw new Error('STAGING_BACKUP_PROJECT_REF_REQUIRED')
  if (runtimeProjectRef !== stagingProjectRef) throw new Error('STAGING_BACKUP_PROJECT_REF_MISMATCH')
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED')
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) throw new Error('STAGING_BACKUP_MAX_AGE_INVALID')

  const response = await fetchImpl(API_BASE + '/' + encodeURIComponent(stagingProjectRef) + '/database/backups', {
    headers: {
      authorization: 'Bearer ' + accessToken,
      accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error('STAGING_BACKUP_API_FAILED_' + response.status)

  const payload = await response.json()
  const latest = selectLatestCompletedBackup(payload)
  if (!latest) throw new Error('STAGING_BACKUP_COMPLETED_NOT_FOUND')
  const ageSeconds = Math.floor((now - latest.at) / 1000)
  if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) throw new Error('STAGING_BACKUP_STALE')

  return {
    ageSeconds,
    physical: latest.physical,
    insertedAt: new Date(latest.at).toISOString(),
  }
}

async function main() {
  const result = await checkManagedStagingBackup({
    runtimeProjectRef: process.env.SUPABASE_PROJECT_REF?.trim(),
    stagingProjectRef: process.env.SUPABASE_STAGING_PROJECT_REF?.trim(),
    accessToken: process.env.SUPABASE_ACCESS_TOKEN?.trim(),
    maxAgeSeconds: Number(process.env.STAGING_BACKUP_MAX_AGE_SECONDS ?? '90000'),
  })
  console.log('managed_staging_backup_ok inserted_at=' + result.insertedAt + ' age_seconds=' + result.ageSeconds + ' physical=' + result.physical)
}

if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch((error) => {
    console.error('managed_staging_backup_failed ' + (error instanceof Error ? error.message : 'UNKNOWN'))
    process.exit(1)
  })
}
