import { Card, CardTitle } from '../../../shared/ui/card'
import type { TaskType } from '@/modules/tasks/public'
import type { TaskQueueBucket, TaskQueueEntry } from './task-queue'

const bucketLabels: Record<TaskQueueBucket, string> = {
  overdue: 'Atrasada',
  due_soon: 'Vencendo em breve',
  unassigned: 'Sem responsável',
  on_track: 'Em dia',
}

const typeLabels: Record<TaskType, string> = {
  schedule_follow_up: 'Agendar retorno',
  contact_patient: 'Contatar paciente',
  resend_form: 'Reenviar formulário',
  collect_payment: 'Cobrar pagamento',
  review_document: 'Revisar documento',
  special_confirmation: 'Confirmação especial',
  other_admin: 'Outra pendência',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

type TaskFormAction = (formData: FormData) => void | Promise<void>

export function TaskQueueView({
  entries,
  currentUserId,
  professionals,
  completeAction,
  claimAction,
  reassignAction,
}: {
  entries: TaskQueueEntry[]
  currentUserId: string
  professionals: { userId: string; displayName: string | null }[]
  completeAction: TaskFormAction
  claimAction: TaskFormAction
  reassignAction: TaskFormAction
}) {
  if (entries.length === 0) {
    return <Card><CardTitle>Fila de tarefas</CardTitle><p className="empty-state">Nenhuma pendência administrativa no momento.</p></Card>
  }

  return <Card aria-labelledby="task-queue-title">
    <CardTitle>Fila de tarefas</CardTitle>
    <ul aria-label="Pendências administrativas" className="task-queue-list">
      {entries.map((entry) => (
        <li key={entry.id} className={`task-queue-item task-queue-item--${entry.bucket}`}>
          <span className="task-queue-item__bucket">{bucketLabels[entry.bucket]}</span>
          <strong>{entry.title}</strong>
          <span>{typeLabels[entry.type]}</span>
          <span>{entry.assignedToName ? `Responsável: ${entry.assignedToName}` : 'Sem responsável'}</span>
          {entry.dueAt ? <span>Vence em {dateFormatter.format(new Date(entry.dueAt))}</span> : null}
          {entry.personId ? (
            <a href={`/pessoas/${entry.personId}/gerenciar`}>{entry.personName ?? 'Ver pessoa'}</a>
          ) : null}

          <form action={completeAction}>
            <input type="hidden" name="task_id" value={entry.id} />
            <button className="ui-button ui-button--primary" type="submit">Concluir</button>
          </form>

          {!entry.assignedToUserId ? (
            <form action={claimAction}>
              <input type="hidden" name="task_id" value={entry.id} />
              <input type="hidden" name="user_id" value={currentUserId} />
              <button className="ui-button" type="submit">Assumir</button>
            </form>
          ) : null}

          {professionals.length > 0 ? (
            <form action={reassignAction} className="task-queue-item__reassign">
              <input type="hidden" name="task_id" value={entry.id} />
              <label className="form-field">
                <span className="form-field__label">Reatribuir a</span>
                <select className="ui-select" name="assigned_to_user_id" defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {professionals.map((professional) => (
                    <option key={professional.userId} value={professional.userId}>
                      {professional.displayName ?? professional.userId}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ui-button" type="submit">Reatribuir</button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  </Card>
}
