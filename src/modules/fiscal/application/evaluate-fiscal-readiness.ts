import { validateForLiveIssuance, type FiscalProfile } from '../domain/fiscal-profile'
import { evaluateTreatment, type FiscalSourceKind, type FiscalTreatment } from '../domain/fiscal-treatment'

export type FiscalPayer = {
  document: string | null
  address: Record<string, unknown> | null
}

export type FiscalReadinessInput = {
  sourceKind: FiscalSourceKind
  amountCents: number
  profile: FiscalProfile | null
  treatment: FiscalTreatment | null
  payer: FiscalPayer | null
}

export type FiscalReadinessBlocker =
  | 'FISCAL_PROFILE_INCOMPLETE'
  | 'FISCAL_TREATMENT_NOT_CONFIGURED'
  | 'FISCAL_TREATMENT_NOT_APPROVED'
  | 'FISCAL_TREATMENT_NOT_ISSUABLE'
  | 'FISCAL_TREATMENT_REQUIRES_REVIEW'
  | 'FISCAL_PAYER_NOT_CONFIGURED'
  | 'FISCAL_PAYER_DOCUMENT_MISSING'
  | 'FISCAL_PAYER_ADDRESS_MISSING'
  | 'FISCAL_AMOUNT_INVALID'
  | 'FISCAL_SERVICE_CODE_MISSING'

export type FiscalReadiness = {
  status: 'ready' | 'review' | 'not_ready'
  blockers: FiscalReadinessBlocker[]
}

export function evaluateFiscalReadiness(input: FiscalReadinessInput): FiscalReadiness {
  const blockers: FiscalReadinessBlocker[] = []

  if (!input.profile || !validateForLiveIssuance(input.profile).ok) {
    blockers.push('FISCAL_PROFILE_INCOMPLETE')
  }

  const treatmentEvaluation = evaluateTreatment({
    sourceKind: input.sourceKind,
    treatment: input.treatment,
  })
  if (!treatmentEvaluation.ok) {
    blockers.push(treatmentEvaluation.error)
  }

  if (!input.payer) {
    blockers.push('FISCAL_PAYER_NOT_CONFIGURED')
  } else {
    if (!input.payer.document?.trim()) blockers.push('FISCAL_PAYER_DOCUMENT_MISSING')
    if (!input.payer.address || Object.keys(input.payer.address).length === 0) {
      blockers.push('FISCAL_PAYER_ADDRESS_MISSING')
    }
  }

  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    blockers.push('FISCAL_AMOUNT_INVALID')
  }

  const serviceCode = input.treatment?.serviceCode ?? input.profile?.serviceCode
  if (!serviceCode?.trim()) blockers.push('FISCAL_SERVICE_CODE_MISSING')

  if (treatmentEvaluation.ok) {
    if (treatmentEvaluation.treatment.issuanceRule === 'not_issuable') {
      blockers.push('FISCAL_TREATMENT_NOT_ISSUABLE')
    } else if (treatmentEvaluation.treatment.issuanceRule === 'manual_review') {
      blockers.push('FISCAL_TREATMENT_REQUIRES_REVIEW')
    }
  }

  if (blockers.includes('FISCAL_TREATMENT_REQUIRES_REVIEW')) {
    return { status: 'review', blockers }
  }

  return { status: blockers.length === 0 ? 'ready' : 'not_ready', blockers }
}
