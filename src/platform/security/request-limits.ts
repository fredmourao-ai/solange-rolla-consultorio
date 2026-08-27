const REQUEST_LIMITS = {
  json: 1024 * 1024,
  form: 2 * 1024 * 1024,
  signature: 256 * 1024,
  upload: 10 * 1024 * 1024,
} as const

export function assertRequestSize(sizeBytes: number, kind: keyof typeof REQUEST_LIMITS): void {
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > REQUEST_LIMITS[kind]) throw new Error('REQUEST_TOO_LARGE')
}

function hasMagicBytes(mediaType: string, bytes: Uint8Array): boolean {
  if (mediaType === 'image/png') return bytes.length >= 4 && bytes.slice(0, 4).every((value, index) => value === [137, 80, 78, 71][index])
  if (mediaType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mediaType === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 4)) === '%PDF'
  return false
}

export function validateUpload(input: { mediaType: string; bytes: Uint8Array; maxBytes?: number }): { ok: true } | { ok: false; error: string } {
  if (input.bytes.length > (input.maxBytes ?? REQUEST_LIMITS.upload)) return { ok: false, error: 'UPLOAD_TOO_LARGE' }
  if (!['image/png', 'image/jpeg', 'application/pdf'].includes(input.mediaType) || !hasMagicBytes(input.mediaType, input.bytes)) return { ok: false, error: 'UPLOAD_TYPE_INVALID' }
  return { ok: true }
}

export function publicErrorResponse(errorCode: string): Response {
  void errorCode
  return new Response(JSON.stringify({ error: 'REQUEST_NOT_AVAILABLE' }), {
    status: 400,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
  })
}
