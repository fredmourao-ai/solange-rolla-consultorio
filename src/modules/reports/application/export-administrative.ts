import { PDFDocument, StandardFonts } from 'pdf-lib'

export type AdministrativeExportRow = {
  data: string
  categoria: string
  descricao: string
  valorCents: number
  status: string
}

export type AdministrativeExport = { content: Uint8Array; mediaType: string; extension: 'csv' | 'xlsx' | 'pdf' }

const encoder = new TextEncoder()
function xml(value: string): string { return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;') }
function neutralizeSpreadsheetFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
function csv(value: string): string {
  const safe = neutralizeSpreadsheetFormula(value)
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"','""')}"` : safe
}
function money(cents: number): string { return (cents / 100).toFixed(2).replace('.', ',') }

export function buildAdministrativeCsv(rows: readonly AdministrativeExportRow[]): Uint8Array {
  const lines = [['Data','Categoria','Descrição','Valor (R$)','Status'], ...rows.map(r => [r.data,r.categoria,r.descricao,money(r.valorCents),r.status])]
  return encoder.encode(`\uFEFF${lines.map(row => row.map(csv).join(';')).join('\r\n')}\r\n`)
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i=0;i<8;i+=1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
function u16(n:number){ return Uint8Array.of(n&255,(n>>>8)&255) }
function u32(n:number){ return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255) }
function concat(parts: readonly Uint8Array[]): Uint8Array { const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let o=0; for(const p of parts){out.set(p,o);o+=p.length} return out }
function zipStore(files: readonly {name:string;data:Uint8Array}[]): Uint8Array {
  const local:Uint8Array[]=[]; const central:Uint8Array[]=[]; let offset=0
  for(const file of files){
    const name=encoder.encode(file.name); const crc=crc32(file.data)
    const header=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(file.data.length),u32(file.data.length),u16(name.length),u16(0),name])
    local.push(header,file.data)
    central.push(concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(file.data.length),u32(file.data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]))
    offset += header.length + file.data.length
  }
  const centralBytes=concat(central)
  return concat([...local,centralBytes,u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBytes.length),u32(offset),u16(0)])
}

export function buildAdministrativeXlsx(rows: readonly AdministrativeExportRow[]): Uint8Array {
  const values = [['Data','Categoria','Descrição','Valor (R$)','Status'], ...rows.map(r => [r.data,r.categoria,r.descricao,(r.valorCents/100).toFixed(2),r.status])]
  const sheetRows=values.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>{ const col=String.fromCharCode(65+ci); const numeric=ci===3&&ri>0; return numeric?`<c r="${col}${ri+1}"><v>${v}</v></c>`:`<c r="${col}${ri+1}" t="inlineStr"><is><t>${xml(String(v))}</t></is></c>` }).join('')}</row>`).join('')
  const files=[
    {name:'[Content_Types].xml',data:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')},
    {name:'_rels/.rels',data:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
    {name:'xl/workbook.xml',data:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Administrativo" sheetId="1" r:id="rId1"/></sheets></workbook>')},
    {name:'xl/_rels/workbook.xml.rels',data:encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')},
    {name:'xl/worksheets/sheet1.xml',data:encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`)},
  ]
  return zipStore(files)
}

export async function buildAdministrativePdf(rows: readonly AdministrativeExportRow[], period: string): Promise<Uint8Array> {
  const doc=await PDFDocument.create(); const font=await doc.embedFont(StandardFonts.Helvetica); const bold=await doc.embedFont(StandardFonts.HelveticaBold)
  let page=doc.addPage([595,842]); let y=800
  const line=(text:string,strong=false)=>{ if(y<50){page=doc.addPage([595,842]);y=800} page.drawText(text.slice(0,105),{x:40,y,size:9,font:strong?bold:font}); y-=14 }
  line('Relatório administrativo',true); line(`Período: ${period}`); line('Data | Categoria | Descrição | Valor (R$) | Status',true)
  for(const r of rows) line(`${r.data} | ${r.categoria} | ${r.descricao} | ${money(r.valorCents)} | ${r.status}`)
  return doc.save()
}

export async function buildAdministrativeExport(format:string, rows:readonly AdministrativeExportRow[], period:string): Promise<AdministrativeExport> {
  if(format==='csv') return {content:buildAdministrativeCsv(rows),mediaType:'text/csv; charset=utf-8',extension:'csv'}
  if(format==='xlsx') return {content:buildAdministrativeXlsx(rows),mediaType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',extension:'xlsx'}
  if(format==='pdf') return {content:await buildAdministrativePdf(rows,period),mediaType:'application/pdf',extension:'pdf'}
  throw new Error('REPORT_EXPORT_FORMAT_UNSUPPORTED')
}
