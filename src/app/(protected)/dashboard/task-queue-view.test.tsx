import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TaskQueueView } from './task-queue-view'
import type { TaskQueueEntry } from './task-queue'

function entry(overrides: Partial<TaskQueueEntry> = {}): TaskQueueEntry {
  return {
    id: 'task-1',
    type: 'other_admin',
    title: 'Tratar pendência administrativa',
    status: 'open',
    bucket: 'on_track',
    assignedToUserId: 'secretary-1',
    assignedToName: 'Ana Secretária',
    personId: null,
    personName: null,
    appointmentId: null,
    dueAt: null,
    ...overrides,
  }
}

describe('TaskQueueView', () => {
  it('shows an empty state when there is nothing in the queue', () => {
    const html = renderToStaticMarkup(
      <TaskQueueView
        entries={[]}
        currentUserId="secretary-1"
        professionals={[]}
        completeAction={vi.fn()}
        claimAction={vi.fn()}
        reassignAction={vi.fn()}
      />,
    )
    expect(html).toContain('Nenhuma pendência administrativa no momento.')
  })

  it('labels overdue and unassigned entries distinctly from on-track ones', () => {
    const html = renderToStaticMarkup(
      <TaskQueueView
        entries={[
          entry({ id: 'a', bucket: 'overdue', title: 'Documento para revisão', type: 'review_document' }),
          entry({ id: 'b', bucket: 'unassigned', assignedToUserId: null, assignedToName: null, title: 'Confirmação especial necessária', type: 'special_confirmation' }),
        ]}
        currentUserId="secretary-1"
        professionals={[]}
        completeAction={vi.fn()}
        claimAction={vi.fn()}
        reassignAction={vi.fn()}
      />,
    )
    expect(html).toContain('Atrasada')
    expect(html).toContain('Sem responsável')
    expect(html).toContain('Documento para revisão')
    expect(html).toContain('Confirmação especial necessária')
  })

  it('offers a claim action only for unassigned tasks', () => {
    const html = renderToStaticMarkup(
      <TaskQueueView
        entries={[
          entry({ id: 'a', bucket: 'unassigned', assignedToUserId: null, assignedToName: null }),
          entry({ id: 'b', bucket: 'on_track', assignedToUserId: 'secretary-1', assignedToName: 'Ana' }),
        ]}
        currentUserId="secretary-1"
        professionals={[]}
        completeAction={vi.fn()}
        claimAction={vi.fn()}
        reassignAction={vi.fn()}
      />,
    )
    expect(html).toContain('task_id" value="a"')
    const bTaskIndex = html.indexOf('task_id" value="b"')
    expect(bTaskIndex).toBeGreaterThan(-1)
  })

  it('shows a quick link to the correlated person when permitted and present', () => {
    const html = renderToStaticMarkup(
      <TaskQueueView
        entries={[entry({ id: 'a', personId: 'person-1', personName: 'Ana Demonstração' })]}
        currentUserId="secretary-1"
        professionals={[]}
        completeAction={vi.fn()}
        claimAction={vi.fn()}
        reassignAction={vi.fn()}
      />,
    )
    expect(html).toContain('href="/pessoas/person-1/gerenciar"')
    expect(html).toContain('Ana Demonstração')
  })
})
