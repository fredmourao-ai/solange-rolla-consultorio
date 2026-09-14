import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  ClinicalRecordEditor,
  HANDOFF_TYPE_OPTIONS,
  requiresFollowUpDays,
  requiresHandoffAssignee,
} from './clinical-record-editor'

describe('ClinicalRecordEditor handoff', () => {
  it('renders no assignee or follow-up field before any handoff type is chosen', () => {
    const html = renderToStaticMarkup(
      <ClinicalRecordEditor
        personId="person-1"
        action={vi.fn()}
        secretaries={[{ userId: 'secretary-1', displayName: 'Ana' }]}
      />,
    )

    expect(html).not.toContain('handoff_assigned_to')
    expect(html).not.toContain('handoff_follow_up_days')
  })

  it('exposes exactly the closed set of handoff types, with no free-text alternative', () => {
    const html = renderToStaticMarkup(
      <ClinicalRecordEditor personId="person-1" action={vi.fn()} secretaries={[]} />,
    )

    for (const option of HANDOFF_TYPE_OPTIONS) {
      expect(html).toContain(`value="${option.value}"`)
    }
    expect(HANDOFF_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      'schedule_follow_up',
      'contact_patient',
      'resend_form',
      'other_admin',
    ])
    expect(html).not.toContain('name="handoff_free_text"')
    expect(html).not.toContain('name="other_admin_detail"')
  })

  it('lists active secretaries by display name, not raw user ids, for the assignee choice', () => {
    const html = renderToStaticMarkup(
      <ClinicalRecordEditor
        personId="person-1"
        action={vi.fn()}
        secretaries={[{ userId: 'uuid-secretary-1', displayName: 'Ana Secretária' }]}
        initialHandoffType="contact_patient"
      />,
    )

    expect(html).toContain('Ana Secretária')
  })
})

describe('requiresHandoffAssignee', () => {
  it('is false when no handoff type is chosen and true for every real handoff type', () => {
    expect(requiresHandoffAssignee('')).toBe(false)
    expect(requiresHandoffAssignee('schedule_follow_up')).toBe(true)
    expect(requiresHandoffAssignee('contact_patient')).toBe(true)
    expect(requiresHandoffAssignee('resend_form')).toBe(true)
    expect(requiresHandoffAssignee('other_admin')).toBe(true)
  })
})

describe('requiresFollowUpDays', () => {
  it('is true only for schedule_follow_up', () => {
    expect(requiresFollowUpDays('schedule_follow_up')).toBe(true)
    expect(requiresFollowUpDays('contact_patient')).toBe(false)
    expect(requiresFollowUpDays('resend_form')).toBe(false)
    expect(requiresFollowUpDays('other_admin')).toBe(false)
    expect(requiresFollowUpDays('')).toBe(false)
  })
})
