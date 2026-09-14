import { describe, expect, it } from 'vitest'
import { canTransitionTask, TASK_STATUSES } from './status'

describe('task status transitions', () => {
  it('allows an open task to move to in_progress, done, or cancelled', () => {
    expect(canTransitionTask('open', 'in_progress')).toBe(true)
    expect(canTransitionTask('open', 'done')).toBe(true)
    expect(canTransitionTask('open', 'cancelled')).toBe(true)
  })

  it('allows an in_progress task to move to done or cancelled', () => {
    expect(canTransitionTask('in_progress', 'done')).toBe(true)
    expect(canTransitionTask('in_progress', 'cancelled')).toBe(true)
    expect(canTransitionTask('in_progress', 'open')).toBe(true)
  })

  it('rejects transitions out of a terminal status', () => {
    expect(canTransitionTask('done', 'open')).toBe(false)
    expect(canTransitionTask('done', 'in_progress')).toBe(false)
    expect(canTransitionTask('cancelled', 'open')).toBe(false)
    expect(canTransitionTask('cancelled', 'done')).toBe(false)
  })

  it('rejects a no-op transition to the same status', () => {
    expect(canTransitionTask('open', 'open')).toBe(false)
    expect(canTransitionTask('done', 'done')).toBe(false)
  })

  it('enumerates every known status exactly once', () => {
    expect(TASK_STATUSES).toEqual(['open', 'in_progress', 'done', 'cancelled'])
  })
})
