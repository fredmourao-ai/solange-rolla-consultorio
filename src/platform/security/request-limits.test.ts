import { describe, expect, it } from 'vitest'
import { assertRequestSize, publicErrorResponse, validateUpload } from './request-limits'

describe('public request safety', () => {
  it('rejects oversized requests before processing', () => {
    expect(() => assertRequestSize(1024 * 1024 + 1, 'json')).toThrow('REQUEST_TOO_LARGE')
    expect(() => assertRequestSize(1024 * 1024, 'json')).not.toThrow()
  })

  it('accepts only allowlisted upload signatures', () => {
    expect(validateUpload({ mediaType: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]), maxBytes: 10 })).toEqual({ ok: true })
    expect(validateUpload({ mediaType: 'image/png', bytes: new Uint8Array([60, 115, 99, 114]), maxBytes: 10 })).toMatchObject({ ok: false, error: 'UPLOAD_TYPE_INVALID' })
  })

  it('returns the same generic response for invalid capability classes', () => {
    const response = publicErrorResponse('CAPABILITY_INVALID')
    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.body).toBeTruthy()
  })
})
