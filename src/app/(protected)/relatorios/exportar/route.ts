import { NextRequest } from 'next/server'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { buildAdministrativeExport, type AdministrativeExportRow } from '@/modules/reports/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'

function date(value:string|null,fallback:string):string { return value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:fallback }
function businessToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function addDays(value:string,days:number){const d=new Date(`${value}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function responseBody(content:string|Uint8Array):BodyInit { if(typeof content==='string') return content; const buffer=new ArrayBuffer(content.byteLength); new Uint8Array(buffer).set(content); return buffer }

export async function GET(request:NextRequest){
 const session=await getStaffSession(); authorizeStaffSession(session,['psychologist_owner','accounting'])
 const start=date(request.nextUrl.searchParams.get('start'),businessToday()); const end=date(request.nextUrl.searchParams.get('end'),addDays(start,30)); if(end<start) return new Response('Período inválido',{status:400})
 const format=request.nextUrl.searchParams.get('format')??'csv'; const fromIso=new Date(`${start}T00:00:00-03:00`).toISOString(); const toIso=new Date(`${addDays(end,1)}T00:00:00-03:00`).toISOString(); const c=await createServerSupabaseClient()
 const [payments,payables,events,fiscal]=await Promise.all([c.from('payments').select('paid_at,amount_cents,method').gte('paid_at',fromIso).lt('paid_at',toIso).order('paid_at'),c.from('payables').select('due_date,amount_cents,paid_cents,status,description').gte('due_date',start).lte('due_date',end).order('due_date'),c.from('events').select('starts_at,title,status,default_price_cents').gte('starts_at',fromIso).lt('starts_at',toIso).order('starts_at'),c.from('fiscal_documents').select('created_at,amount_cents,status,provider').gte('created_at',fromIso).lt('created_at',toIso).order('created_at')])
 if([payments,payables,events,fiscal].some(r=>r.error)) return new Response('Falha ao gerar relatório',{status:500})
 const rows:AdministrativeExportRow[]=[]
 for(const p of payments.data??[]) rows.push({data:new Date(p.paid_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),categoria:'Recebimento',descricao:`Pagamento ${p.method}`,valorCents:p.amount_cents,status:'recebido'})
 for(const p of payables.data??[]) rows.push({data:p.due_date.split('-').reverse().join('/'),categoria:'Conta a pagar',descricao:p.description,valorCents:-p.amount_cents,status:p.status})
 for(const e of events.data??[]) rows.push({data:new Date(e.starts_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),categoria:'Evento',descricao:e.title,valorCents:e.default_price_cents,status:e.status})
 for(const f of fiscal.data??[]) rows.push({data:new Date(f.created_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),categoria:'Fiscal',descricao:`Documento ${f.provider}`,valorCents:f.amount_cents,status:f.status})
 try { const exported=await buildAdministrativeExport(format,rows,`${start} a ${end}`); const filename=`relatorio-administrativo-${start}-${end}.${exported.extension}`; return new Response(responseBody(exported.content),{headers:{'Content-Type':exported.mediaType,'Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store'}}) } catch(error){ if(error instanceof Error&&error.message==='REPORT_FORMAT_UNSUPPORTED') return new Response('Formato inválido',{status:400}); throw error }
}
