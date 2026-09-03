import { afterEach, describe, expect, it, vi } from 'vitest'

const sendMail = vi.fn()
const close = vi.fn()
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail, close })) },
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('smtp email transport', () => {
  it('sends through nodemailer and returns the provider message id', async () => {
    sendMail.mockResolvedValueOnce({ messageId: '<abc@smtp>', rejected: [] })
    const { createSmtpEmailTransport } = await import('./smtp-email-transport')
    const transport = createSmtpEmailTransport({ host: 'smtp.example.test', port: 465, secure: true, user: 'a@example.test', password: 'secret' })

    const result = await transport({ to: 'paciente@example.test', body: 'Olá', from: 'consultorio@example.test', idempotencyKey: 'k1' })

    expect(result).toEqual({ externalId: '<abc@smtp>', status: 'accepted' })
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'paciente@example.test', text: 'Olá', headers: { 'X-Idempotency-Key': 'k1' } }))
    expect(close).toHaveBeenCalledOnce()
  })

  it('throws when the provider rejects the recipient, and still closes the connection', async () => {
    sendMail.mockResolvedValueOnce({ messageId: '<abc@smtp>', rejected: ['paciente@example.test'] })
    const { createSmtpEmailTransport } = await import('./smtp-email-transport')
    const transport = createSmtpEmailTransport({ host: 'smtp.example.test', port: 465, secure: true, user: 'a@example.test', password: 'secret' })

    await expect(transport({ to: 'paciente@example.test', body: 'Olá', from: 'consultorio@example.test', idempotencyKey: 'k1' })).rejects.toThrow(/EMAIL_REJECTED/)
    expect(close).toHaveBeenCalledOnce()
  })
})
