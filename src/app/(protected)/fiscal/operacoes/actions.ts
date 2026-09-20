'use server'

import { createHash } from 'node:crypto'
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

function stableUuid(hex: string): string {
  const value = hex.slice(0, 32)
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`
}

async function context(permission: 'fiscal.issue' | 'fiscal.cancel') {
  const session = await getStaffSession()
  authorizeStaffPermission(session, permission)
  return { session, client: await createServerSupabaseClient() }
}

async function recordIssueFailure(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  documentId: string,
  errorCode: string,
) {
  const { error } = await client.rpc('fail_mock_fiscal_document_issue_atomic', {
    p_document_id: documentId,
    p_error_code: errorCode,
  })
  if (error) throw new Error(`FISCAL_ISSUE_RECOVERY_RECORD_FAILED:${error.code}`)
}

export async function issueMockNfseAction(formData: FormData) {
  const { session, client } = await context('fiscal.issue')
  authorizeStaffPermission(session, 'fiscal.read')
  if (formData.get('review_ack') !== 'yes') throw new Error('FISCAL_REVIEW_ACK_REQUIRED')

  const sourceType = text(formData, 'source_type')
  const sourceId = text(formData, 'source_id')
  const personId = text(formData, 'person_id')
  const payerPersonId = text(formData, 'payer_person_id')
  const amountCents = cents(formData.get('amount'))
  const profileId = text(formData, 'profile_id')
  const treatmentId = text(formData, 'treatment_id')

  const [profileResult, treatmentResult, payerResult] = await Promise.all([
    client.from('fiscal_profiles').select('id,version,active,issuer_document,municipality_code,service_code,tax_regime,fiscal_address').eq('id', profileId).single(),
    client.from('fiscal_treatments').select('id,source_kind,version,issuance_rule,service_code,approved,enabled_for_live').eq('id', treatmentId).single(),
    client.from('people').select('id,cpf_normalized,fiscal_address').eq('id', payerPersonId).single(),
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
  const digest = createHash('sha256').update(idempotencyKey).digest('hex')
  const id = stableUuid(createHash('sha256').update(`fiscal-mock:${idempotencyKey}`).digest('hex'))
  const externalId = `mock-nfse-${digest.slice(0, 20)}`
  const protocol = `mock-protocol-${digest.slice(0, 20)}`
  const xml = new TextEncoder().encode(`<NFS-e synthetic="true" id="${externalId}" amountCents="${amountCents}"/>`)
  const pdf = new TextEncoder().encode(`NFS-e MOCK/SANDBOX\n${externalId}\nValor: ${amountCents}\nSEM VALIDADE FISCAL`)
  const xmlPath = `${id}/nfse.xml`
  const pdfPath = `${id}/nfse.pdf`
  const xmlSha256 = createHash('sha256').update(xml).digest('hex')
  const pdfSha256 = createHash('sha256').update(pdf).digest('hex')

  const { data: begunId, error: beginError } = await client.rpc('begin_mock_fiscal_document_issue_atomic', {
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
    p_xml_path: xmlPath,
    p_pdf_path: pdfPath,
    p_xml_sha256: xmlSha256,
    p_xml_byte_length: xml.byteLength,
    p_pdf_sha256: pdfSha256,
    p_pdf_byte_length: pdf.byteLength,
  })
  if (beginError || begunId !== id) {
    throw new Error(`FISCAL_ISSUE_BEGIN_FAILED:${beginError?.code ?? 'identity_drift'}`)
  }

  const { data: durable, error: durableError } = await client
    .from('fiscal_documents')
    .select('status')
    .eq('id', id)
    .single()
  if (durableError || !durable) throw new Error(`FISCAL_ISSUE_STATE_READ_FAILED:${durableError?.code ?? 'missing'}`)
  if (durable.status === 'issued') redirect('/fiscal/operacoes')
  if (durable.status !== 'processing') throw new Error(`FISCAL_ISSUE_STATE_INVALID:${durable.status}`)

  const bucket = client.storage.from('fiscal-documents-private')

  // A previous interrupted processing attempt may have left one or both artifacts.
  // Removing only processing/retryable paths is authorized by the Storage policy.
  const staleCleanup = await bucket.remove([xmlPath, pdfPath])
  if (staleCleanup.error) {
    await recordIssueFailure(client, id, 'ARTIFACT_PREP_CLEANUP_FAILED')
    throw new Error('FISCAL_ARTIFACT_PREP_CLEANUP_FAILED')
  }

  const xmlUpload = await bucket.upload(xmlPath, xml, { contentType: 'application/xml', upsert: false })
  if (xmlUpload.error) {
    await recordIssueFailure(client, id, 'XML_STORAGE_FAILED')
    throw new Error('FISCAL_XML_STORAGE_FAILED')
  }

  const pdfUpload = await bucket.upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: false })
  if (pdfUpload.error) {
    const cleanup = await bucket.remove([xmlPath])
    await recordIssueFailure(client, id, cleanup.error ? 'ARTIFACT_CLEANUP_FAILED' : 'PDF_STORAGE_FAILED')
    if (cleanup.error) throw new Error('FISCAL_ARTIFACT_CLEANUP_FAILED')
    throw new Error('FISCAL_PDF_STORAGE_FAILED')
  }

  const issuedAt = new Date().toISOString()
  const { data: completedId, error: completeError } = await client.rpc('complete_mock_fiscal_document_issue_atomic', {
    p_document_id: id,
    p_issued_at: issuedAt,
  })
  if (!completeError && completedId === id) redirect('/fiscal/operacoes')

  const { data: finalState, error: stateError } = await client
    .from('fiscal_documents')
    .select('status')
    .eq('id', id)
    .single()
  if (!stateError && finalState?.status === 'issued') redirect('/fiscal/operacoes')

  if (!stateError && finalState?.status === 'processing') {
    const cleanup = await bucket.remove([xmlPath, pdfPath])
    await recordIssueFailure(client, id, cleanup.error ? 'FINALIZE_FAILED_CLEANUP_PENDING' : 'FINALIZE_FAILED')
    throw new Error(cleanup.error ? 'FISCAL_FINALIZE_FAILED_CLEANUP_PENDING' : 'FISCAL_FINALIZE_FAILED')
  }

  throw new Error(`FISCAL_ISSUE_RECOVERY_REQUIRED:${completeError?.code ?? stateError?.code ?? 'unknown'}`)
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
