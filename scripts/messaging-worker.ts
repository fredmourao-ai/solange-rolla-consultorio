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
import { enqueueMessage } from '../src/modules/messaging/application/enqueue-message'
import { drainMessagingQueueOnce, runMessagingWorker } from '../src/workers/messaging-worker-runtime'
import { scheduleDueAppointmentConfirmations } from '../src/workers/appointment-confirmation-scheduling'
import { loadConfirmationCandidates } from '../src/workers/supabase-confirmation-candidates'
import { scheduleBirthdayGreetings } from '../src/workers/birthday-scheduling'
import { issueCapability } from '../src/platform/capabilities/issue'
import { createSupabaseCapabilityIssuanceRepository } from '../src/platform/capabilities/supabase-issue-capability-repository'
import type { MessagingProvider } from '../src/modules/messaging/infrastructure/mock-provider'
import type { MessageChannel } from '../src/modules/messaging/domain/message'

function positiveInt(value: string | undefined, fallback: number, min: number, max: number): number { const parsed = Number.parseInt(value ?? '', 10); if (!Number.isFinite(parsed)) return fallback; return Math.max(min, Math.min(max, parsed)) }
function requireEnv(name: string): string { const value = process.env[name]; if (!value) throw new Error(`${name} is required when its live flag is enabled`); return value }
function log(event: string, metadata: Record<string, unknown> = {}) { console.log(JSON.stringify({ at: new Date().toISOString(), event, ...metadata })) }
function buildWhatsAppProvider(live: boolean): MessagingProvider { if (!live) return createMockProvider(); return createMetaWhatsAppProvider(createFetchWhatsAppTransport(process.env.WHATSAPP_API_VERSION ?? 'v23.0')) }
function buildEmailProvider(live: boolean): MessagingProvider { if (!live) return createMockProvider(); const port = positiveInt(process.env.EMAIL_SMTP_PORT, 465, 1, 65535); return createEmailProvider(createSmtpEmailTransport({ host: requireEnv('EMAIL_SMTP_HOST'), port, secure: port === 465, user: requireEnv('EMAIL_SMTP_USER'), password: requireEnv('EMAIL_SMTP_PASSWORD') }), { from: requireEnv('EMAIL_FROM') }) }

async function main() {
  const env = serverEnv(); const controller = new AbortController(); process.on('SIGTERM', () => controller.abort()); process.on('SIGINT', () => controller.abort())
  const messages = createSupabaseMessageRepository(); const templates = createSupabaseTemplateRepository(); const attempts = createSupabaseMessageAttemptRepository(); const outbox = createSupabaseOutboxRepository(); const capabilityIssuance = createSupabaseCapabilityIssuanceRepository()
  const whatsappProvider = buildWhatsAppProvider(env.WHATSAPP_LIVE_ENABLED); const emailProvider = buildEmailProvider(env.EMAIL_LIVE_ENABLED); const providerFor = (channel: MessageChannel): MessagingProvider => channel === 'whatsapp' ? whatsappProvider : emailProvider
  const queue = createQueue<{ messageId: string }>({ name: 'messaging', backend: createServerSupabaseQueueBackend() })
  async function sendOutboundMessage(messageId: string, attemptNumber: number, retry: (delaySeconds: number) => Promise<void>): Promise<'sent' | 'retry' | 'failed'> { const message = await messages.findById(messageId); if (!message) { log('messaging_message_not_found', { messageId }); return 'failed' }; if (message.status === 'sent') return 'sent'; const activeVersion = await templates.findActiveVersion(message.templateKey, message.channel); if (activeVersion === null) { await attempts.markFailed(messageId); return 'failed' }; const body = await renderVersionedTemplate({ key: message.templateKey, channel: message.channel, version: activeVersion, values: message.payload }, templates); return processMessage({ messageId, attemptNumber, message: { channel: message.channel, recipient: message.recipient, body, idempotencyKey: message.idempotencyKey } }, { provider: providerFor(message.channel), attempts, retryQueue: { requeue: retry } }) }
  const batchSize = positiveInt(process.env.MESSAGING_WORKER_BATCH_SIZE, 10, 1, 50); const pollMs = positiveInt(process.env.MESSAGING_WORKER_POLL_MS, 2000, 250, 60000); const heartbeatPath = process.env.MESSAGING_WORKER_HEALTH_FILE ?? '/tmp/solange-messaging-worker.heartbeat'; const confirmationInterval = positiveInt(process.env.APPOINTMENT_CONFIRMATION_SCHEDULER_INTERVAL_MS, 120000, 30000, 3600000); const birthdayInterval = positiveInt(process.env.BIRTHDAY_SCHEDULER_INTERVAL_MS, 3600000, 300000, 86400000); let lastConfirmation = 0; let lastBirthday = 0
  async function enqueueIfNew(message: Parameters<typeof enqueueMessage>[0]): Promise<boolean> { if (await messages.findByIdempotencyKey(message.idempotencyKey)) return false; await enqueueMessage(message, messages); return true }
  async function scheduleAutomations(): Promise<void> { const now = new Date(); if (now.getTime() - lastBirthday >= birthdayInterval) { lastBirthday = now.getTime(); const count = await scheduleBirthdayGreetings({ now, enqueue: enqueueIfNew }); if (count) log('birthday_greetings_scheduled', { count }) }; if (now.getTime() - lastConfirmation < confirmationInterval) return; lastConfirmation = now.getTime(); const candidates = await loadConfirmationCandidates(now); const scheduled = await scheduleDueAppointmentConfirmations({ now, candidates, alreadyEnqueued: async key => (await messages.findByIdempotencyKey(key)) !== null, issueLink: async candidate => { const { rawToken } = await issueCapability({ purpose: 'appointment_response', subjectType: 'appointment', subjectId: candidate.id, expiresAt: candidate.startsAt, now }, capabilityIssuance); return `${env.APP_URL}/c/${rawToken}?purpose=appointment_response` }, enqueue: enqueueIfNew, logSkipped: (candidateId, reason) => log('appointment_confirmation_skipped', { candidateId, reason }) }); if (scheduled) log('appointment_confirmations_scheduled', { scheduled }) }
  const drain = async () => { try { await scheduleAutomations() } catch (error) { log('messaging_automation_scheduling_failed', { message: error instanceof Error ? error.message : 'unknown' }) }; const dispatched = await dispatchOutbox(outbox, queue, batchSize); return drainMessagingQueueOnce({ queue, process: sendOutboundMessage, batchSize }) }
  const heartbeat = () => writeFile(heartbeatPath, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 })
  await runMessagingWorker({ signal: controller.signal, drain, pollMs, logger: log, heartbeat })
}
main().catch(() => { console.error(JSON.stringify({ at: new Date().toISOString(), event: 'messaging_worker_fatal' })); process.exitCode = 1 })
