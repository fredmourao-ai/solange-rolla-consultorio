import 'server-only'
import { createHash } from 'node:crypto'
import { createPrivateStorage, type PrivateStorage } from '../../../platform/storage/private-storage'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'

type SignatureClient = ReturnType<typeof createServiceRoleSupabaseClient>

function bytesOf(body: unknown): Uint8Array {
  if (body instanceof Uint8Array) return body
  throw new Error('DOCUMENT_STORAGE_BODY_INVALID')
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function isConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { statusCode?: string | number; status?: number; message?: string }
  return String(candidate.statusCode ?? candidate.status ?? '') === '409'
    || /duplicate|already exists|resource exists/iu.test(candidate.message ?? '')
}

function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error) return new Error(String((error as { message: unknown }).message))
  return new Error(fallback)
}
export function createSupabaseSignedDocumentStorage(
  client: SignatureClient = createServiceRoleSupabaseClient(),
): PrivateStorage {
  const bucket = client.storage.from('signed-documents-private')
  return createPrivateStorage({
    bucket: 'signed-documents-private',
    ttlSeconds: 300,
    backend: {
      async upload(path, body, options) {
        const candidate = bytesOf(body)
        const result = await bucket.upload(path, candidate, {
          contentType: options.contentType,
          upsert: false,
        })
        if (!result.error) return { error: null }
        if (!isConflict(result.error)) return { error: asError(result.error, 'DOCUMENT_STORAGE_FAILED') }

        const existing = await bucket.download(path)
        if (existing.error || !existing.data) {
          return { error: asError(existing.error, 'DOCUMENT_STORAGE_CONFLICT_READ_FAILED') }
        }
        const existingBytes = new Uint8Array(await existing.data.arrayBuffer())
        if (sha256(existingBytes) === sha256(candidate)) return { error: null }
        return { error: new Error('DOCUMENT_STORAGE_CONFLICT') }
      },
      async createSignedUrl(path, expiresIn) {
        const result = await bucket.createSignedUrl(path, expiresIn)
        return {
          data: result.data?.signedUrl ? { signedUrl: result.data.signedUrl } : null,
          error: result.error ? asError(result.error, 'SIGNED_URL_CREATION_FAILED') : null,
        }
      },
    },
  })
}
