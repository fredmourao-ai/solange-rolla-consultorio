export type SyntheticFinance = {
  consultationId: string
  receivableCents: number
  paymentCents: number
  paymentIdempotencyKey: string
  fiscalProvider: 'mock'
}

export function syntheticConsultationFinance(consultationId = 'synthetic-appointment-1'): SyntheticFinance {
  return { consultationId, receivableCents: 150000, paymentCents: 150000, paymentIdempotencyKey: `payment:${consultationId}:1`, fiscalProvider: 'mock' }
}

export function uniqueJobKeys(keys: string[]): string[] { return [...new Set(keys)] }
