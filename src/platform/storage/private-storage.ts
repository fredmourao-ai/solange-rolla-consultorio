export const PRIVATE_BUCKETS = [
  'signed-documents-private',
  'fiscal-documents-private',
  'financial-receipts-private',
  'clinical-private',
] as const

export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number]

export type StorageUploadOptions = {
  contentType?: string
  upsert?: boolean
}

export type PrivateStorageBackend = {
  upload(path: string, body: unknown, options: StorageUploadOptions): Promise<{ error: Error | null }>
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: Error | null }>
}

export type PrivateStorage = {
  put(path: string, body: unknown, options?: StorageUploadOptions): Promise<void>
  createShortLivedDownloadUrl(path: string): Promise<string>
  validatePath(path: string): void
}

type PrivateObjectPathInput = {
  entity: string
  entityId: string
  objectId: string
  extension: string
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const pathPattern = /^[a-z][a-z0-9-]{0,63}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/

export function buildPrivateObjectPath(input: PrivateObjectPathInput): string {
  const entity = input.entity.toLowerCase()
  const extension = input.extension.toLowerCase().replace(/^\./u, '')
  if (!/^[a-z][a-z0-9-]{0,63}$/u.test(entity) || !/^[a-z0-9]{1,10}$/u.test(extension)) {
    throw new Error('OPAQUE_STORAGE_PATH')
  }
  if (!uuidPattern.test(input.entityId) || !uuidPattern.test(input.objectId)) {
    throw new Error('OPAQUE_STORAGE_PATH')
  }

  return entity + '/' + input.entityId + '/' + input.objectId + '.' + extension
}

export function createPrivateStorage({
  bucket,
  backend,
  ttlSeconds = 300,
}: {
  bucket: PrivateBucket
  backend: PrivateStorageBackend
  ttlSeconds?: number
}): PrivateStorage {
  if (!PRIVATE_BUCKETS.includes(bucket)) throw new Error('UNKNOWN_PRIVATE_BUCKET')
  const effectiveTtl = Math.max(1, Math.min(600, Math.floor(ttlSeconds)))

  const validatePath = (path: string) => {
    if (!pathPattern.test(path)) throw new Error('OPAQUE_STORAGE_PATH')
  }

  return {
    validatePath,

    async put(path, body, options = {}) {
      validatePath(path)
      const result = await backend.upload(path, body, { ...options, upsert: options.upsert ?? false })
      if (result.error) throw result.error
    },

    async createShortLivedDownloadUrl(path) {
      validatePath(path)
      const result = await backend.createSignedUrl(path, effectiveTtl)
      if (result.error || !result.data?.signedUrl) {
        throw result.error ?? new Error('SIGNED_URL_CREATION_FAILED')
      }
      return result.data.signedUrl
    },
  }
}
