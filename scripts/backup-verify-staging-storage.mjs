import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export const REQUIRED_PRIVATE_BUCKETS = [
  'signed-documents-private',
  'fiscal-documents-private',
  'financial-receipts-private',
  'clinical-private',
]

const PROBE_BYTES = Buffer.from('solange-storage-recovery-probe-v1')

function requireConfig() {
  const stagingRef = process.env.SUPABASE_STAGING_PROJECT_REF || ''
  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF || ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const secretKey = process.env.SUPABASE_SECRET_KEY || ''
  const destination = process.env.STAGING_STORAGE_BACKUP_DEST || ''
  if (!stagingRef || !productionRef || !url || !secretKey || !destination) {
    throw new Error('STAGING_STORAGE_BACKUP_CONFIG_REQUIRED')
  }
  if (stagingRef === productionRef) throw new Error('STAGING_STORAGE_PRODUCTION_FORBIDDEN')
  const hostname = new URL(url).hostname
  if (!hostname.startsWith(`${stagingRef}.`)) throw new Error('STAGING_STORAGE_PROJECT_REF_MISMATCH')
  return { url, secretKey, destination }
}

function safeTarget(root, objectPath) {
  const parts = objectPath.split('/')
  if (!parts.length || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error('STAGING_STORAGE_OBJECT_PATH_INVALID')
  }
  const target = path.resolve(root, ...parts)
  const resolvedRoot = path.resolve(root)
  if (!target.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('STAGING_STORAGE_OBJECT_PATH_ESCAPE')
  return target
}

async function listObjectPaths(bucket) {
  const result = []
  async function walk(prefix = '') {
    let offset = 0
    for (;;) {
      const listed = await bucket.list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (listed.error) throw new Error('STAGING_STORAGE_LIST_FAILED')
      const rows = listed.data ?? []
      for (const row of rows) {
        const objectPath = prefix ? `${prefix}/${row.name}` : row.name
        if (row.id) result.push(objectPath)
        else await walk(objectPath)
      }
      if (rows.length < 100) break
      offset += rows.length
    }
  }
  await walk()
  return result.sort()
}

async function removeRestoreBucket(client, bucketName) {
  const emptied = await client.storage.emptyBucket(bucketName)
  if (emptied.error) throw new Error('STAGING_STORAGE_RESTORE_BUCKET_EMPTY_FAILED')
  const deleted = await client.storage.deleteBucket(bucketName)
  if (deleted.error) throw new Error('STAGING_STORAGE_RESTORE_BUCKET_DELETE_FAILED')
}

async function removeSourceProbe(client, probe) {
  const removed = await client.storage.from(probe.bucket).remove([probe.path])
  if (removed.error) throw new Error('STAGING_STORAGE_SOURCE_PROBE_CLEANUP_FAILED')
}

export async function backupAndVerifyStagingStorage({
  url,
  secretKey,
  destination,
  createClientImpl = createClient,
}) {
  await mkdir(destination, { recursive: true, mode: 0o700 })
  const client = createClientImpl(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const restoreBuckets = []
  const sourceProbes = []
  let primaryError
  let result

  try {
    const bucketsResult = await client.storage.listBuckets()
    if (bucketsResult.error) throw new Error('STAGING_STORAGE_BUCKET_LIST_FAILED')
    const buckets = new Map((bucketsResult.data ?? []).map((bucket) => [bucket.id, bucket]))
    for (const bucketName of REQUIRED_PRIVATE_BUCKETS) {
      const bucket = buckets.get(bucketName)
      if (!bucket) throw new Error('STAGING_STORAGE_REQUIRED_BUCKET_MISSING')
      if (bucket.public) throw new Error('STAGING_STORAGE_PRIVATE_BUCKET_PUBLIC')
    }

    const manifest = []
    for (const bucketName of REQUIRED_PRIVATE_BUCKETS) {
      const source = client.storage.from(bucketName)
      let objectPaths = await listObjectPaths(source)
      if (objectPaths.length === 0) {
        const probePath = `audit-recovery-probe/${randomUUID()}.txt`
        const uploaded = await source.upload(probePath, PROBE_BYTES, {
          upsert: false,
          contentType: 'text/plain',
        })
        if (uploaded.error) throw new Error('STAGING_STORAGE_SOURCE_PROBE_UPLOAD_FAILED')
        sourceProbes.push({ bucket: bucketName, path: probePath })
        objectPaths = [probePath]
      }

      const bucketRoot = path.join(destination, bucketName)
      await mkdir(bucketRoot, { recursive: true, mode: 0o700 })
      for (const objectPath of objectPaths) {
        const downloaded = await source.download(objectPath)
        if (downloaded.error || !downloaded.data) throw new Error('STAGING_STORAGE_DOWNLOAD_FAILED')
        const bytes = Buffer.from(await downloaded.data.arrayBuffer())
        const target = safeTarget(bucketRoot, objectPath)
        await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
        await writeFile(target, bytes, { mode: 0o600 })
        manifest.push({
          bucket: bucketName,
          path: objectPath,
          bytes: bytes.byteLength,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        })
      }
    }

    const manifestPath = path.join(destination, 'manifest.json')
    const manifestBytes = Buffer.from(JSON.stringify({ version: 1, objects: manifest }, null, 2) + '\n')
    await writeFile(manifestPath, manifestBytes, { mode: 0o600 })
    await writeFile(
      `${manifestPath}.sha256`,
      `${createHash('sha256').update(manifestBytes).digest('hex')}  manifest.json\n`,
      { mode: 0o600 },
    )

    for (let index = 0; index < REQUIRED_PRIVATE_BUCKETS.length; index += 1) {
      const sourceName = REQUIRED_PRIVATE_BUCKETS[index]
      const restoreName = `audit-restore-${randomUUID().slice(0, 8)}-${index}`
      const created = await client.storage.createBucket(restoreName, { public: false })
      if (created.error) throw new Error('STAGING_STORAGE_RESTORE_BUCKET_CREATE_FAILED')
      restoreBuckets.push(restoreName)
      const restore = client.storage.from(restoreName)
      const entries = manifest.filter((row) => row.bucket === sourceName)
      if (entries.length === 0) throw new Error('STAGING_STORAGE_BUCKET_RECOVERY_NOT_EXERCISED')
      for (const entry of entries) {
        const filePath = safeTarget(path.join(destination, sourceName), entry.path)
        const bytes = await readFile(filePath)
        const uploaded = await restore.upload(entry.path, bytes, {
          upsert: false,
          contentType: 'application/octet-stream',
        })
        if (uploaded.error) throw new Error('STAGING_STORAGE_RESTORE_UPLOAD_FAILED')
        const downloaded = await restore.download(entry.path)
        if (downloaded.error || !downloaded.data) throw new Error('STAGING_STORAGE_RESTORE_DOWNLOAD_FAILED')
        const restored = Buffer.from(await downloaded.data.arrayBuffer())
        const digest = createHash('sha256').update(restored).digest('hex')
        if (digest !== entry.sha256 || restored.byteLength !== entry.bytes) {
          throw new Error('STAGING_STORAGE_RESTORE_HASH_MISMATCH')
        }
      }
    }

    result = {
      bucketCount: REQUIRED_PRIVATE_BUCKETS.length,
      objectCount: manifest.length,
      totalBytes: manifest.reduce((sum, entry) => sum + entry.bytes, 0),
      probeCount: sourceProbes.length,
    }
  } catch (error) {
    primaryError = error
  }

  const cleanupErrors = []
  for (const bucketName of restoreBuckets.reverse()) {
    try {
      await removeRestoreBucket(client, bucketName)
    } catch (error) {
      cleanupErrors.push(error)
    }
  }
  for (const probe of sourceProbes.reverse()) {
    try {
      await removeSourceProbe(client, probe)
    } catch (error) {
      cleanupErrors.push(error)
    }
  }

  if (primaryError && cleanupErrors.length) {
    throw new AggregateError([primaryError, ...cleanupErrors], 'STAGING_STORAGE_OPERATION_AND_CLEANUP_FAILED')
  }
  if (primaryError) throw primaryError
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'STAGING_STORAGE_CLEANUP_FAILED')
  return result
}

async function main() {
  const config = requireConfig()
  const result = await backupAndVerifyStagingStorage(config)
  process.stdout.write(
    `staging_storage_backup_restore_ok buckets=${result.bucketCount} objects=${result.objectCount} bytes=${result.totalBytes} probes=${result.probeCount}\n`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`)
    process.exitCode = 1
  })
}
