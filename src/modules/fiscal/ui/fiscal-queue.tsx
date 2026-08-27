import { FiscalStatus } from './fiscal-status'
import type { FiscalDocumentStatus } from '../domain/fiscal-document'

export type FiscalQueueItem = {
  id: string
  status: FiscalDocumentStatus
  sourceLabel: string
  detail: string
}

export function FiscalQueue({ items }: { items: FiscalQueueItem[] }) {
  return (
    <ul className="fiscal-queue" aria-label="Fila fiscal">
      {items.map((item) => (
        <li className="fiscal-queue__item" key={item.id}>
          <div className="fiscal-queue__heading">
            <strong>{item.sourceLabel}</strong>
            <FiscalStatus status={item.status} />
          </div>
          <p>{item.detail}</p>
        </li>
      ))}
    </ul>
  )
}
