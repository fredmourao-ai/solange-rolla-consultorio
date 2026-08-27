export type FiscalIssuerKind = 'individual' | 'company'

export type FiscalProfile = {
  version: number
  issuerKind: FiscalIssuerKind
  issuerDocument: string
  municipalityCode: string
  serviceCode: string
  taxRegime: string
  effectiveFrom: string
  fiscalAddress?: Record<string, string>
  active?: boolean
}

export type FiscalProfileValidation =
  | { ok: true }
  | { ok: false; error: 'FISCAL_PROFILE_INCOMPLETE' }

export function validateForLiveIssuance(
  profile: FiscalProfile,
): FiscalProfileValidation {
  const requiredValues = [
    profile.issuerDocument,
    profile.municipalityCode,
    profile.serviceCode,
    profile.taxRegime,
    profile.effectiveFrom,
  ]

  if (
    !['individual', 'company'].includes(profile.issuerKind) ||
    requiredValues.some((value) => typeof value !== 'string' || !value.trim())
  ) {
    return { ok: false, error: 'FISCAL_PROFILE_INCOMPLETE' }
  }

  return { ok: true }
}
