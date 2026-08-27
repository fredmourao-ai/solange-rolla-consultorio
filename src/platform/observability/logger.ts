import 'server-only'
import { randomUUID } from 'node:crypto'
import { redact } from './redaction'

export type LogContext = Record<string, unknown>
export type StructuredLog = { correlation_id: string; event: string; module: string; status: string; context?: LogContext }

export function createCorrelationId(): string { return `req_${randomUUID()}` }

export function logEvent(input: Omit<StructuredLog, 'correlation_id'> & { correlationId?: string }): StructuredLog {
  const event: StructuredLog = { correlation_id: input.correlationId ?? createCorrelationId(), event: input.event, module: input.module, status: input.status, ...(input.context ? { context: redact(input.context) as LogContext } : {}) }
  console.info(JSON.stringify(event))
  return event
}
