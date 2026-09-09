import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actions = readFileSync('src/app/(protected)/financeiro/operacoes/actions.ts', 'utf8')

describe('financial mutations are atomic', () => {
  it('records receivable payments through the atomic database function', () => {
    expect(actions).toContain("'record_receivable_payment_atomic'")
    expect(actions).not.toMatch(/recordPaymentAction[\s\S]*?\.from\('payments'\)\.insert/)
  })

  it('records refunds through the atomic database function', () => {
    expect(actions).toContain("'refund_receivable_payment_atomic'")
    expect(actions).not.toMatch(/refundPaymentAction[\s\S]*?\.from\('payment_refunds'\)\.insert/)
  })

  it('records payable payments through the atomic database function', () => {
    expect(actions).toContain("'record_payable_payment_atomic'")
    expect(actions).not.toMatch(/payPayableAction[\s\S]*?\.from\('payable_payments'\)\.insert/)
  })
})