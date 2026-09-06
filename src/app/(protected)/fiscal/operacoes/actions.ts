'use server'

import { createHash, randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import type { Json } from '@/platform/supabase/types'

function text(formData: FormData, key: string): string { const value=String(formData.get(key)??'').trim(); if(!value) throw new Error(`FISCAL_${key.toUpperCase()}_REQUIRED`); return value }
function cents(value: FormDataEntryValue|null): number { const n=Math.round(Number(String(value??'').replace(',','.'))*100); if(!Number.isSafeInteger(n)||n<=0) throw new Error('FISCAL_AMOUNT_INVALID'); return n }
async function context(){ const session=await getStaffSession(); const authorized=authorizeStaffSession(session,['psychologist_owner','accounting']); return {authorized,client:await createServerSupabaseClient()} }
async function audit(client:Awaited<ReturnType<typeof createServerSupabaseClient>>,actorId:string,action:string,entityType:string,entityId:string,metadata:{[key:string]:Json|undefined}){ const {error}=await client.from('audit_events').insert({actor_user_id:actorId,action,entity_type:entityType,entity_id:entityId,correlation_id:entityId,metadata}); if(error) throw new Error('FISCAL_AUDIT_FAILED') }

export async function issueMockNfseAction(formData:FormData){
 const {authorized,client}=await context(); if(formData.get('review_ack')!=='yes') throw new Error('FISCAL_REVIEW_ACK_REQUIRED')
 const sourceType=text(formData,'source_type'); const sourceId=text(formData,'source_id'); const personId=text(formData,'person_id'); const payerPersonId=text(formData,'payer_person_id'); const amountCents=cents(formData.get('amount')); const profileId=text(formData,'profile_id'); const treatmentId=text(formData,'treatment_id')
 const payerQuery=authorized.role==='accounting'
  ? client.from('accounting_people_view').select('id,cpf_normalized,fiscal_address').eq('id',payerPersonId).single()
  : client.from('people').select('id,cpf_normalized,fiscal_address').eq('id',payerPersonId).single()
 const [profileResult,treatmentResult,payerResult]=await Promise.all([client.from('fiscal_profiles').select('id,version,active,issuer_document,municipality_code,service_code,tax_regime,fiscal_address').eq('id',profileId).single(),client.from('fiscal_treatments').select('id,source_kind,version,issuance_rule,service_code,approved,enabled_for_live').eq('id',treatmentId).single(),payerQuery])
 if(profileResult.error) throw new Error(`FISCAL_PROFILE_READ_FAILED:${profileResult.error.code}`)
 if(treatmentResult.error) throw new Error(`FISCAL_TREATMENT_READ_FAILED:${treatmentResult.error.code}`)
 if(payerResult.error) throw new Error(`FISCAL_PAYER_READ_FAILED:${payerResult.error.code}`)
 const profile=profileResult.data; const treatment=treatmentResult.data; const payer=payerResult.data
 if(!profile?.active||!profile.issuer_document||!profile.municipality_code||!profile.service_code||!profile.tax_regime) throw new Error('FISCAL_PROFILE_INCOMPLETE')
 if(!treatment||treatment.source_kind!==sourceType||treatment.issuance_rule==='not_issuable') throw new Error('FISCAL_TREATMENT_NOT_ISSUABLE')
 if(!payer?.cpf_normalized||!payer.fiscal_address||Object.keys(payer.fiscal_address as Record<string,unknown>).length===0) throw new Error('FISCAL_PAYER_NOT_CONFIGURED')
 const idempotencyKey=`${sourceType}:${sourceId}:${profile.version}:${treatment.version}`; const {data:existing}=await client.from('fiscal_documents').select('id').eq('idempotency_key',idempotencyKey).maybeSingle(); if(existing) redirect('/fiscal/operacoes')
 const id=randomUUID(); const digest=createHash('sha256').update(idempotencyKey).digest('hex'); const externalId=`mock-nfse-${digest.slice(0,20)}`; const protocol=`mock-protocol-${digest.slice(0,20)}`
 const xml=new TextEncoder().encode(`<NFS-e synthetic="true" id="${externalId}" amountCents="${amountCents}"/>`); const pdf=new TextEncoder().encode(`NFS-e MOCK/SANDBOX\n${externalId}\nValor: ${amountCents}\nSEM VALIDADE FISCAL`); const xmlPath=`${id}/nfse.xml`; const pdfPath=`${id}/nfse.pdf`; const bucket=client.storage.from('fiscal-documents-private')
 const xmlUpload=await bucket.upload(xmlPath,xml,{contentType:'application/xml',upsert:false}); if(xmlUpload.error) throw new Error('FISCAL_XML_STORAGE_FAILED'); const pdfUpload=await bucket.upload(pdfPath,pdf,{contentType:'application/pdf',upsert:false}); if(pdfUpload.error){await bucket.remove([xmlPath]); throw new Error('FISCAL_PDF_STORAGE_FAILED')}
 const {error}=await client.from('fiscal_documents').insert({id,source_type:sourceType,source_id:sourceId,person_id:personId,payer_person_id:payerPersonId,amount_cents:amountCents,profile_id:profileId,profile_version:profile.version,treatment_id:treatmentId,treatment_version:treatment.version,provider:'mock',idempotency_key:idempotencyKey,external_id:externalId,protocol,status:'issued',issued_at:new Date().toISOString(),xml_path:xmlPath,pdf_path:pdfPath,xml_sha256:createHash('sha256').update(xml).digest('hex'),xml_byte_length:xml.byteLength,pdf_sha256:createHash('sha256').update(pdf).digest('hex'),pdf_byte_length:pdf.byteLength}); if(error){await bucket.remove([xmlPath,pdfPath]); if(error.code==='23505') redirect('/fiscal/operacoes'); throw new Error('FISCAL_DOCUMENT_CREATE_FAILED')}
 const {error:attemptError}=await client.from('fiscal_attempts').insert({fiscal_document_id:id,attempt_number:1,operation:'issue',status:'succeeded',provider_status:'issued',correlation_id:randomUUID(),finished_at:new Date().toISOString()}); if(attemptError) throw new Error('FISCAL_ATTEMPT_CREATE_FAILED')
 await audit(client,authorized.userId,'fiscal.mock_issued','fiscal_document',id,{sourceType,sourceId,amountCents,provider:'mock',synthetic:true,liveEnabled:false}); redirect('/fiscal/operacoes')
}

export async function cancelMockNfseAction(formData:FormData){
 const {authorized,client}=await context(); const id=text(formData,'fiscal_document_id'); const reason=text(formData,'reason'); const key=`fiscal-cancel:${id}`; const {data:doc,error:docError}=await client.from('fiscal_documents').select('id,status,provider,protocol').eq('id',id).single(); if(docError) throw new Error(`FISCAL_DOCUMENT_READ_FAILED:${docError.code}`); if(!doc||doc.provider!=='mock') throw new Error('FISCAL_MOCK_ONLY'); if(doc.status==='cancelled') redirect('/fiscal/operacoes'); if(doc.status!=='issued'&&doc.status!=='cancel_requested') throw new Error('FISCAL_CANCELLATION_INVALID_STATE')
 const {data:existing}=await client.from('fiscal_cancellation_events').select('id').eq('idempotency_key',key).maybeSingle(); if(existing) redirect('/fiscal/operacoes')
 if(doc.status==='issued'){const {error}=await client.from('fiscal_documents').update({status:'cancel_requested'}).eq('id',id); if(error) throw new Error('FISCAL_CANCEL_REQUEST_FAILED')}
 const {error:eventError}=await client.from('fiscal_cancellation_events').insert({fiscal_document_id:id,idempotency_key:key,reason,requested_by:authorized.userId,provider_protocol:doc.protocol,status:'cancelled',completed_at:new Date().toISOString()}); if(eventError) throw new Error('FISCAL_CANCEL_EVENT_FAILED')
 const {error:updateError}=await client.from('fiscal_documents').update({status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',id); if(updateError) throw new Error('FISCAL_CANCEL_FAILED')
 const {error:attemptError}=await client.from('fiscal_attempts').insert({fiscal_document_id:id,attempt_number:1,operation:'cancel',status:'succeeded',provider_status:'cancelled',correlation_id:randomUUID(),finished_at:new Date().toISOString()}); if(attemptError) throw new Error('FISCAL_CANCEL_ATTEMPT_FAILED')
 await audit(client,authorized.userId,'fiscal.mock_cancelled','fiscal_document',id,{reason,provider:'mock'}); redirect('/fiscal/operacoes')
}
