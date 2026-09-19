import { describe, expect, it } from 'vitest'
import { normalizeLoginCredentials } from './login-identifier'

describe('normalizeLoginCredentials', () => {
  it('never maps the removed temporary admin alias to a real account', () => {
    expect(normalizeLoginCredentials('admin', 'admin')).toEqual({ email: 'admin', password: 'admin' })
  })

  it('trims the identifier without changing the password', () => {
    expect(normalizeLoginCredentials('  owner@example.com  ', 'secret')).toEqual({ email: 'owner@example.com', password: 'secret' })
  })

  it('keeps regular email credentials unchanged', () => {
    expect(normalizeLoginCredentials('owner@example.com', 'secret')).toEqual({ email: 'owner@example.com', password: 'secret' })
  })
})