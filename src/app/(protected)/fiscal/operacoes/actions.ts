'use server'

import { createHash, randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { authorizeStaffPermission, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'

function text(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) throw new Error(`FISCAL_${key.toUpperCase()}_REQUIRED`)
  return value
}

function cents(value: FormDataEntryValue | null): number {
  const parsed = Math.round(Number(String(value ?? '').replace(',', '.')) * 100)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('FISCAL_AMOUNT_INVALID')
  return parsed
}

async function context(permission: 'fiscal.issue' | 'fiscal.cancel') {
  const session = await getStaffSession()
  const authorized = authorizeStaffPermission(session, permission)
  return { authorized, client: await createServerSupabaseClient() }
}

export async function issueMockNfseAction(formData: FormData) {
  const { authorized, client } = await context('fiscal.issue')
  if (formData.get('review_ack') !== 'yes') throw new Error('FISCAL_REVIEW_ACK_REQUIRED')

  const sourceType = text(formData, 'source_type')
  const sourceId = text(formData, 'source_id')
  const personId = text(formData, 'person_id')
  const payerPersonId = text(formData, 'payer_person_id')
  const amountCents = cents(formData.get('amount'))
  const profileId = text(formData, 'profile_id')
  const treatmentId = text(formData, 'treatment_id')

  const payerQuery = authorized.role === 'accounting'
    ? client.from('accounting_people_view').select('id,cpf_normalized,fiscal_address').eq('id', payerPersonId).single()
    : client.from('people').select('id,cpf_normalized,fiscal_address').eq('id', payerPersonId).single()

  const [profileResult, treatmentResult, payerResult] = await Promise.all([
    client.from('fiscal_profiles').select('id,version,active,issuer_document,municipality_code,service_code,tax_regime,fiscal_address').eq('id', profileId).single(),
    client.from('fiscal_treatments').select('id,source_kind,version,issuance_rule,service_code,approved,enabled_for_live').eq('id', treatmentId).single(),
    payerQuery,
  ])
  if (profileResult.error) throw new Error(`FISCAL_PROFILE_READ_FAILED:${profileResult.error.code}`)
  if (treatmentResult.error) throw new Error(`FISCAL_TREATMENT_READ_FAILED:${treatmentResult.error.code}`)
  if (payerResult.error) throw new Error(`FISCAL_PAYER_READ_FAILED:${payerResult.error.code}`)

  const profile = profileResult.data
  const treatment = treatmentResult.data
  const payer = payerResult.data

  if (!profile?.active || !profile.issuer_document || !profile.municipality_code || !profile.service_code || !profile.tax_regime) {
    throw new Error('FISCAL_PROFILE_INCOMPLETE')
  }
  if (!treatment || treatment.source_kind !== sourceType || treatment.issuance_rule === 'not_issuable') {
    throw new Error('FISCAL_TREATMENT_NOT_ISSUABLE')
  }
  if (!payer?.cpf_normalized || !payer.fiscal_address || Object.keys(payer.fiscal_address as Record<string, unknown>).length === 0) {
    throw new Error('FISCAL_PAYER_NOT_CONFIGURED')
  }

  const idempotencyKey = `${sourceType}:${sourceId}:${profile.version}:${treatment.version}`
  const { data: existing } = await client.from('fiscal_documents').select('id').eq('idempotency_key', idempotencyKey).maybeSingle()
  if (existing) redirect('/fiscal/operacoes')

  const id = randomUUID()
  const digest = createHash('sha256').update(idempotencyKey).digest('hex')
  const externalId = `mock-nfse-${digest.slice(0, 20)}`
  const protocol = `mock-protocol-${digest.slice(0, 20)}`
  const xml = new TextEncoder().encode(`<NFS-e synthetic="true" id="${externalId}" amountCents="${amountCents}"/>`)
  const pdf = new TextEncoder().encode(`NFS-e MOCK/SANDBOX\n${externalId}\nValor: ${amountCents}\nSEM VALIDADE FISCAL`)
  const xmlPath = `${id}/nfse.xml`
  const pdfPath = `${id}/nfse.pdf`
  const xmlSha256 = createHash('sha256').update(xml).digest('hex')
  const pdfSha256 = createHash('sha256').update(pdf).digest('hex')
  const issuedAt = new Date().toISOString()
  const bucket = client.storage.from('fiscal-documents-private')

  const xmlUpload = await bucket.upload(xmlPath, xml, { contentType: 'application/xml', upsert: false })
  if (xmlUpload.error) throw new Error('FISCAL_XML_STORAGE_FAILED')

  const pdfUpload = await bucket.upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: false })
  if (pdfUpload.error) {
    const cleanup = await bucket.remove([xmlPath])
    if (cleanup.error) throw new Error('FISCAL_ARTIFACT_ROLLBACK_FAILED')
    throw new Error('FISCAL_PDF_STORAGE_FAILED')
  }

  const { data: persistedId, error } = await client.rpc('issue_mock_fiscal_document_atomic', {
    p_document_id: id,
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_person_id: personId,
    p_payer_person_id: payerPersonId,
    p_amount_cents: amountCents,
    p_profile_id: profileId,
    p_profile_version: profile.version,
    p_treatment_id: treatmentId,
    p_treatment_version: treatment.version,
    p_idempotency_key: idempotencyKey,
    p_external_id: externalId,
    p_protocol: protocol,
    p_issued_at: issuedAt,
    p_xml_path: xmlPath,
    p_pdf_path: pdfPath,
    p_xml_sha256: xmlSha256,
    p_xml_byte_length: xml.byteLength,
    p_pdf_sha256: pdfSha256,
    p_pdf_byte_length: pdf.byteLength,
  })

  if (error || persistedId !== id) {
    const cleanup = await bucket.remove([xmlPath, pdfPath])
    if (cleanup.error) throw new Error('FISCAL_ARTIFACT_ROLLBACK_FAILED')
    if (error?.code === '23505') redirect('/fiscal/operacoes')
    throw new Error(`FISCAL_DOCUMENT_CREATE_FAILED:${error?.code ?? 'unknown'}`)
  }

  redirect('/fiscal/operacoes')
}

export async function cancelMockNfseAction(formData: FormData) {
  const { client } = await context('fiscal.cancel')
  const id = text(formData, 'fiscal_document_id')
  const reason = text(formData, 'reason')
  const { error } = await client.rpc('cancel_mock_fiscal_document_atomic', {
    p_document_id: id,
    p_reason: reason,
  })
  if (error) throw new Error(`FISCAL_CANCEL_FAILED:${error.code}`)
  redirect('/fiscal/operacoes')
}
