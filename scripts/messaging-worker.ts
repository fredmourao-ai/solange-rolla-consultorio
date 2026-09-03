import { writeFile } from 'node:fs/promises'
import { createQueue } from '../src/platform/queue/queue'
import { createServerSupabaseQueueBackend } from '../src/platform/queue/supabase-queue'
import { serverEnv } from '../src/platform/env/server'
import { createSupabaseMessageRepository } from '../src/modules/messaging/infrastructure/supabase-message-repository'
import { createSupabaseTemplateRepository } from '../src/modules/messaging/infrastructure/supabase-template-repository'
import { createSupabaseMessageAttemptRepository } from '../src/modules/messaging/infrastructure/supabase-attempt-repository'
import { createMockProvider } from '../src/modules/messaging/infrastructure/mock-provider'
import { createMetaWhatsAppProvider } from '../src/modules/messaging/infrastructure/meta-whatsapp-provider'
import { createEmailProvider } from '../src/modules/messaging/infrastructure/email-provider'
import { createFetchWhatsAppTransport } from '../src/modules/messaging/infrastructure/fetch-whatsapp-transport'
import { createSmtpEmailTransport } from '../src/modules/messaging/infrastructure/smtp-email-transport'
import { createSupabaseOutboxRepository } from '../src/modules/messaging/infrastructure/supabase-outbox-repository'
import { renderVersionedTemplate } from '../src/modules/messaging/application/render-template'
import { processMessage } from '../src/modules/messaging/application/process-message'
import { dispatchOutbox } from '../src/modules/messaging/application/dispatch-outbox'
import { drainMessagingQueueOnce, runMessagingWorker } from '../src/workers/messaging-worker-runtime'
import type { MessagingProvider } from '../src/modules/messaging/infrastructure/mock-provider'
import type { MessageChannel } from '../src/modules/messaging/domain/message'

function positiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required when its live flag is enabled`)
  return value
}

function log(event: string, metadata: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...metadata }))
}

function buildWhatsAppProvider(live: boolean): MessagingProvider {
  if (!live) return createMockProvider()
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v23.0'
  return createMetaWhatsAppProvider(createFetchWhatsAppTransport(apiVersion))
}

function buildEmailProvider(live: boolean): MessagingProvider {
  if (!live) return createMockProvider()
  const port = positiveInt(process.env.EMAIL_SMTP_PORT, 465, 1, 65535)
  const transport = createSmtpEmailTransport({
    host: requireEnv('EMAIL_SMTP_HOST'),
    port,
    secure: port === 465,
    user: requireEnv('EMAIL_SMTP_USER'),
    password: requireEnv('EMAIL_SMTP_PASSWORD'),
  })
  return createEmailProvider(transport, { from: requireEnv('EMAIL_FROM') })
}

async function main() {
  const env = serverEnv()
  const controller = new AbortController()
  process.on('SIGTERM', () => controller.abort())
  process.on('SIGINT', () => controller.abort())

  const messages = createSupabaseMessageRepository()
  const templates = createSupabaseTemplateRepository()
  const attempts = createSupabaseMessageAttemptRepository()
  const outbox = createSupabaseOutboxRepository()

  const whatsappProvider = buildWhatsAppProvider(env.WHATSAPP_LIVE_ENABLED)
  const emailProvider = buildEmailProvider(env.EMAIL_LIVE_ENABLED)
  const providerFor = (channel: MessageChannel): MessagingProvider => (channel === 'whatsapp' ? whatsappProvider : emailProvider)

  const queue = createQueue<{ messageId: string }>({
    name: 'messaging',
    backend: createServerSupabaseQueueBackend(),
  })

  async function sendOutboundMessage(messageId: string, attemptNumber: number, retry: (delaySeconds: number) => Promise<void>): Promise<'sent' | 'retry' | 'failed'> {
    const message = await messages.findById(messageId)
    if (!message) {
      log('messaging_message_not_found', { messageId })
      return 'failed'
    }
    if (message.status === 'sent') return 'sent'

    const activeVersion = await templates.findActiveVersion(message.templateKey, message.channel)
    if (activeVersion === null) {
      log('messaging_template_not_active', { messageId, templateKey: message.templateKey, channel: message.channel })
      await attempts.markFailed(messageId)
      return 'failed'
    }
    const body = await renderVersionedTemplate(
      { key: message.templateKey, channel: message.channel, version: activeVersion, values: message.payload },
      templates,
    )
    return processMessage(
      { messageId, attemptNumber, message: { channel: message.channel, recipient: message.recipient, body, idempotencyKey: message.idempotencyKey } },
      { provider: providerFor(message.channel), attempts, retryQueue: { requeue: retry } },
    )
  }

  const batchSize = positiveInt(process.env.MESSAGING_WORKER_BATCH_SIZE, 10, 1, 50)
  const pollMs = positiveInt(process.env.MESSAGING_WORKER_POLL_MS, 2000, 250, 60000)
  const heartbeatPath = process.env.MESSAGING_WORKER_HEALTH_FILE ?? '/tmp/solange-messaging-worker.heartbeat'

  const drain = async () => {
    const dispatched = await dispatchOutbox(outbox, queue, batchSize)
    if (dispatched > 0) log('messaging_outbox_dispatched', { dispatched })
    return drainMessagingQueueOnce({ queue, process: sendOutboundMessage, batchSize })
  }
  const heartbeat = () => writeFile(heartbeatPath, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 })

  log('messaging_worker_started', { batchSize, pollMs, whatsappLive: env.WHATSAPP_LIVE_ENABLED, emailLive: env.EMAIL_LIVE_ENABLED })
  await runMessagingWorker({
    signal: controller.signal,
    drain,
    pollMs,
    logger: log,
    heartbeat,
  })
  log('messaging_worker_stopped')
}

main().catch(() => {
  console.error(JSON.stringify({ at: new Date().toISOString(), event: 'messaging_worker_fatal' }))
  process.exitCode = 1
})
