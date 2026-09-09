const REQUEST_LIMITS = {
  json: 1024 * 1024,
  form: 2 * 1024 * 1024,
  signature: 256 * 1024,
  upload: 10 * 1024 * 1024,
} as const

type RequestKind = keyof typeof REQUEST_LIMITS

export function assertRequestSize(sizeBytes: number, kind: RequestKind): void {
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > REQUEST_LIMITS[kind]) throw new Error('REQUEST_TOO_LARGE')
}

async function readBoundedRequestBody(request: Request, kind: RequestKind): Promise<Uint8Array> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null) {
    const normalized = declaredLength.trim()
    if (!/^\d+$/.test(normalized)) throw new Error('REQUEST_SIZE_INVALID')
    assertRequestSize(Number(normalized), kind)
  }

  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      assertRequestSize(total, kind)
      chunks.push(value)
    }
  } catch (error) {
    try { await reader.cancel() } catch { /* ignore cancellation failure */ }
    throw error
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function cloneRequestWithBoundedBody(request: Request, kind: RequestKind): Promise<Request> {
  const body = await readBoundedRequestBody(request, kind)
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const bodyBuffer = hasBody ? Uint8Array.from(body).buffer : undefined
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bodyBuffer,
  })
}

export async function parseBoundedFormData(request: Request, kind: Extract<RequestKind, 'form' | 'signature'> = 'form'): Promise<FormData> {
  const bounded = await cloneRequestWithBoundedBody(request, kind)
  return bounded.formData()
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
