import { describe, expect, it } from 'vitest'
import { capabilityCookieOptions } from './cookie'

describe('capability cookie options', () => {
  it('is secure by default and allows an explicit local-http override', () => {
    expect(capabilityCookieOptions(300)).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' })
    expect(capabilityCookieOptions(300, { secure: false })).toMatchObject({ httpOnly: true, secure: false, sameSite: 'lax' })
  })
})
