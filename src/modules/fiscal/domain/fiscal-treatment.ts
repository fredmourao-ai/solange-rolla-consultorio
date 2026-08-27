export type FiscalSourceKind =
  | 'appointment_completed'
  | 'appointment_late_cancellation'
  | 'appointment_no_show'
  | 'event_registration'
  | 'other_service'

export type FiscalIssuanceRule =
  | 'service_completed'
  | 'payment_received'
  | 'manual_review'
  | 'not_issuable'

export type FiscalTreatment = {
  sourceKind: FiscalSourceKind
  version: number
  issuanceRule: FiscalIssuanceRule
  serviceCode?: string
  enabledForLive: boolean
  effectiveFrom: string
  approved: boolean
}

export type FiscalTreatmentEvaluation =
  | { ok: true; treatment: FiscalTreatment }
  | {
      ok: false
      error: 'FISCAL_TREATMENT_NOT_CONFIGURED' | 'FISCAL_TREATMENT_NOT_APPROVED'
    }

export function evaluateTreatment(input: {
  sourceKind: FiscalSourceKind
  treatment: FiscalTreatment | null
}): FiscalTreatmentEvaluation {
  if (!input.treatment || input.treatment.sourceKind !== input.sourceKind) {
    return { ok: false, error: 'FISCAL_TREATMENT_NOT_CONFIGURED' }
  }

  if (!input.treatment.approved) {
    return { ok: false, error: 'FISCAL_TREATMENT_NOT_APPROVED' }
  }

  return { ok: true, treatment: input.treatment }
}
