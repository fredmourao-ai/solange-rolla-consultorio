import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  backupAndVerifyStagingStorage,
  REQUIRED_PRIVATE_BUCKETS,
} from '../../scripts/backup-verify-staging-storage.mjs'

type BucketState = { public: boolean; objects: Map<string, Buffer> }

const tempRoots: string[] = []
afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function makeDestination() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'staging-storage-recovery-'))
  tempRoots.push(root)
  return root
}

function makeFakeClient(options: {
  publicBucket?: string
  corruptRestoreDownload?: boolean
  failFirstRestoreCleanup?: boolean
  maliciousSourceName?: string
} = {}) {
  const buckets = new Map<string, BucketState>()
  for (const name of REQUIRED_PRIVATE_BUCKETS) {
    buckets.set(name, { public: options.publicBucket === name, objects: new Map() })
  }
  if (options.maliciousSourceName) {
    buckets.get(REQUIRED_PRIVATE_BUCKETS[0])?.objects.set(options.maliciousSourceName, Buffer.from('bad'))
  }

  const emptyAttempts: string[] = []
  const deleteAttempts: string[] = []
  const sourceProbeRemoveAttempts: string[] = []
  let cleanupFailureUsed = false

  function directRows(objects: Map<string, Buffer>, prefix: string) {
    const children = new Map<string, { name: string; id: string | null }>()
    for (const objectPath of objects.keys()) {
      const relative = prefix ? objectPath.slice(prefix.length + 1) : objectPath
      if (prefix && !objectPath.startsWith(prefix + '/')) continue
      if (!relative) continue
      const [name, ...rest] = relative.split('/')
      if (!name) continue
      children.set(name, { name, id: rest.length ? null : 'object-id' })
    }
    return [...children.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  const client = {
    storage: {
      async listBuckets() {
        return {
          data: [...buckets.entries()].map(([id, state]) => ({ id, name: id, public: state.public })),
          error: null,
        }
      },
      from(bucketName: string) {
        const state = buckets.get(bucketName)
        if (!state) throw new Error('FAKE_BUCKET_NOT_FOUND')
        return {
          async list(prefix = '', args: { limit?: number; offset?: number } = {}) {
            const rows = directRows(state.objects, prefix)
            const offset = args.offset ?? 0
            const limit = args.limit ?? 100
            return { data: rows.slice(offset, offset + limit), error: null }
          },
          async upload(objectPath: string, body: Buffer | Uint8Array) {
            state.objects.set(objectPath, Buffer.from(body))
            return { data: { path: objectPath }, error: null }
          },
          async download(objectPath: string) {
            const bytes = state.objects.get(objectPath)
            if (!bytes) return { data: null, error: new Error('missing') }
            const corrupt = options.corruptRestoreDownload && bucketName.startsWith('audit-restore-')
            const payload = corrupt ? Buffer.concat([bytes, Buffer.from('corrupt')]) : bytes
            return { data: new Blob([payload]), error: null }
          },
          async remove(paths: string[]) {
            for (const objectPath of paths) {
              if (REQUIRED_PRIVATE_BUCKETS.includes(bucketName)) {
                sourceProbeRemoveAttempts.push(bucketName + ':' + objectPath)
              }
              state.objects.delete(objectPath)
            }
            return { data: null, error: null }
          },
        }
      },
      async createBucket(bucketName: string, config: { public: boolean }) {
        if (buckets.has(bucketName)) return { data: null, error: new Error('exists') }
        buckets.set(bucketName, { public: config.public, objects: new Map() })
        return { data: { name: bucketName }, error: null }
      },
      async emptyBucket(bucketName: string) {
        emptyAttempts.push(bucketName)
        if (options.failFirstRestoreCleanup && !cleanupFailureUsed) {
          cleanupFailureUsed = true
          return { data: null, error: new Error('synthetic cleanup failure') }
        }
        buckets.get(bucketName)?.objects.clear()
        return { data: null, error: null }
      },
      async deleteBucket(bucketName: string) {
        deleteAttempts.push(bucketName)
        buckets.delete(bucketName)
        return { data: null, error: null }
      },
    },
  }

  return { client, buckets, emptyAttempts, deleteAttempts, sourceProbeRemoveAttempts }
}

function run(fake: ReturnType<typeof makeFakeClient>, destination = makeDestination()) {
  return backupAndVerifyStagingStorage({
    url: 'https://staging-ref.supabase.co',
    secretKey: 'synthetic-secret',
    destination,
    createClientImpl: () => fake.client,
  })
}

describe('staging storage recovery drill', () => {
  it('exercises every empty private bucket with a synthetic probe and removes probes afterwards', async () => {
    const fake = makeFakeClient()
    const result = await run(fake)

    expect(result).toMatchObject({
      bucketCount: REQUIRED_PRIVATE_BUCKETS.length,
      objectCount: REQUIRED_PRIVATE_BUCKETS.length,
      probeCount: REQUIRED_PRIVATE_BUCKETS.length,
    })
    for (const bucketName of REQUIRED_PRIVATE_BUCKETS) {
      expect(fake.buckets.get(bucketName)?.objects.size).toBe(0)
    }
    expect([...fake.buckets.keys()].filter((name) => name.startsWith('audit-restore-'))).toEqual([])
    expect(fake.sourceProbeRemoveAttempts).toHaveLength(REQUIRED_PRIVATE_BUCKETS.length)
  })

  it('fails closed when a required bucket is public', async () => {
    const fake = makeFakeClient({ publicBucket: REQUIRED_PRIVATE_BUCKETS[0] })
    await expect(run(fake)).rejects.toThrow('STAGING_STORAGE_PRIVATE_BUCKET_PUBLIC')
  })

  it('detects restore hash mismatch and still cleans source probes and restore buckets', async () => {
    const fake = makeFakeClient({ corruptRestoreDownload: true })
    await expect(run(fake)).rejects.toThrow('STAGING_STORAGE_RESTORE_HASH_MISMATCH')
    expect(fake.sourceProbeRemoveAttempts).toHaveLength(REQUIRED_PRIVATE_BUCKETS.length)
    expect([...fake.buckets.keys()].filter((name) => name.startsWith('audit-restore-'))).toEqual([])
  })

  it('attempts cleanup for every resource even when the first restore cleanup fails', async () => {
    const fake = makeFakeClient({ failFirstRestoreCleanup: true })
    await expect(run(fake)).rejects.toThrow('STAGING_STORAGE_CLEANUP_FAILED')
    expect(fake.emptyAttempts).toHaveLength(REQUIRED_PRIVATE_BUCKETS.length)
    expect(fake.sourceProbeRemoveAttempts).toHaveLength(REQUIRED_PRIVATE_BUCKETS.length)
    expect(fake.deleteAttempts.length).toBe(REQUIRED_PRIVATE_BUCKETS.length - 1)
  })

  it('rejects a source object path that would escape the backup root', async () => {
    const fake = makeFakeClient({ maliciousSourceName: '..' })
    await expect(run(fake)).rejects.toThrow('STAGING_STORAGE_OBJECT_PATH_INVALID')
  })
})
