import { describe, expect, it } from 'vitest'
import { err, ok } from './result'

describe('Result', () => {
  it('represents success and failure explicitly', () => {
    expect(ok('x')).toEqual({ ok: true, value: 'x' })
    expect(err('bad')).toEqual({ ok: false, error: 'bad' })
  })
})
