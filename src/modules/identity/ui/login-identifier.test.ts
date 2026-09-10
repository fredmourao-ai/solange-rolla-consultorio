import { describe, expect, it } from 'vitest'
import { normalizeLoginCredentials } from './login-identifier'

describe('normalizeLoginCredentials', () => {
  it('maps admin/admin only when the temporary demo login is enabled', () => {
    expect(normalizeLoginCredentials('admin', 'admin', true)).toEqual({
      email: 'demo.owner@solange.invalid',
      password: 'DemoLocalOnly!2026',
    })
  })

  it('does not map the temporary login when disabled', () => {
    expect(normalizeLoginCredentials('admin', 'admin', false)).toEqual({ email: 'admin', password: 'admin' })
  })

  it('keeps regular email credentials unchanged', () => {
    expect(normalizeLoginCredentials('owner@example.com', 'secret', true)).toEqual({ email: 'owner@example.com', password: 'secret' })
  })
})
