import 'server-only'
import nodemailer from 'nodemailer'
import type { EmailTransport } from './email-provider'

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
}

/**
 * Real SMTP transport for createEmailProvider(). One transporter per call is
 * intentional here: this runs inside the messaging worker's own send path,
 * not a hot request path, so the small per-message connection cost is an
 * acceptable trade for never holding a long-lived credentialed connection
 * open between sends.
 */
export function createSmtpEmailTransport(config: SmtpConfig): EmailTransport {
  return async function sendSmtp(input) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
    try {
      const info = await transporter.sendMail({
        from: input.from,
        to: input.to,
        replyTo: input.replyTo,
        subject: 'Solange Rolla',
        text: input.body,
        headers: { 'X-Idempotency-Key': input.idempotencyKey },
      })
      const rejected = info.rejected ?? []
      if (rejected.length > 0) throw new Error(`EMAIL_REJECTED_${rejected.length}`)
      return { externalId: info.messageId, status: 'accepted' }
    } finally {
      transporter.close()
    }
  }
}
