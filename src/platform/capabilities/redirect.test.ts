import { describe, expect, it } from 'vitest'
import { canonicalCapabilityDestination } from './redirect'

describe('canonical capability redirect', () => {
  it('uses configured app origin instead of the normalized request origin', () => {
    expect(canonicalCapabilityDestination('/formulario', 'http://127.0.0.1:3000').toString())
      .toBe('http://127.0.0.1:3000/formulario')
  })
})
