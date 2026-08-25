import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '../env/server'
import type { Database } from '../supabase/types'
import type {
  QueueBackend,
  QueueJob,
  QueueMessage,
  QueueName,
  QueueReadOptions,
  QueueSendOptions,
} from './types'

type QueueRpcName = 'queue_send' | 'queue_read' | 'queue_archive' | 'queue_requeue'

type QueueRpcError = { message: string }
type QueueRpcResult = { data: unknown; error: QueueRpcError | null }
export type QueueRpc = (
  name: QueueRpcName,
  args: Record<string, unknown>,
) => Promise<QueueRpcResult>

type CreateSupabaseQueueBackendOptions = {
  rpc: QueueRpc
}

function unwrap<T>(result: QueueRpcResult, validate: (value: unknown) => value is T): T {
  if (result.error) {
    throw new Error(result.error.message)
  }

  if (!validate(result.data)) {
    throw new Error('invalid queue RPC response')
  }

  return result.data
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isQueueMessage(value: unknown): value is QueueMessage<unknown> {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    typeof value.idempotencyKey === 'string' &&
    typeof value.correlationId === 'string' &&
    typeof value.createdAt === 'string' &&
    'payload' in value
  )
}

function isQueueRow(value: unknown): value is {
  id: string
  read_count: number
  enqueued_at: string
  visible_at: string
  message: QueueMessage<unknown>
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.read_count === 'number' &&
    typeof value.enqueued_at === 'string' &&
    typeof value.visible_at === 'string' &&
    isQueueMessage(value.message)
  )
}

function isQueueRows(value: unknown): value is Array<ReturnTypeForQueueRead> {
  return Array.isArray(value) && value.every(isQueueRow)
}

type ReturnTypeForQueueRead = {
  id: string
  read_count: number
  enqueued_at: string
  visible_at: string
  message: QueueMessage<unknown>
}

export function createSupabaseQueueBackend({
  rpc,
}: CreateSupabaseQueueBackendOptions): QueueBackend {
  return {
    async send(queueName: QueueName, message: QueueMessage<unknown>, options: Required<QueueSendOptions>) {
      const result = await rpc('queue_send', {
        p_queue_name: queueName,
        p_message: message,
        p_delay_seconds: options.delaySeconds,
      })

      return unwrap(result, isString)
    },

    async read(queueName: QueueName, options: Required<QueueReadOptions>) {
      const result = await rpc('queue_read', {
        p_queue_name: queueName,
        p_visibility_timeout_seconds: options.visibilityTimeoutSeconds,
        p_quantity: options.batchSize,
      })
      const rows = unwrap(result, isQueueRows)

      return rows.map(
        (row): QueueJob<unknown> => ({
          id: row.id,
          readCount: row.read_count,
          enqueuedAt: row.enqueued_at,
          visibleAt: row.visible_at,
          message: row.message,
        }),
      )
    },

    async archive(queueName: QueueName, id: string) {
      const result = await rpc('queue_archive', {
        p_queue_name: queueName,
        p_message_id: id,
      })

      return unwrap(result, isBoolean)
    },

    async requeue(queueName: QueueName, id: string, delaySeconds: number) {
      const result = await rpc('queue_requeue', {
        p_queue_name: queueName,
        p_message_id: id,
        p_delay_seconds: delaySeconds,
      })

      return unwrap(result, isBoolean)
    },
  }
}

export function createServerSupabaseQueueBackend(): QueueBackend {
  const env = serverEnv()
  const client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )

  return createSupabaseQueueBackend({
    rpc: async (name, args) => {
      const { data, error } = await client.rpc(name as never, args as never)
      return {
        data,
        error: error ? { message: error.message } : null,
      }
    },
  })
}
