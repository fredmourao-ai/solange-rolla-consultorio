import { describe, expect, it } from 'vitest'
import { buildAdministrativeCsv, buildAdministrativeExport, buildAdministrativeXlsx } from './export-administrative'
const rows=[{data:'04/09/2026',categoria:'Recebimento',descricao:'Pagamento pix',valorCents:12345,status:'recebido'}]
describe('administrative exports',()=>{
 it('writes PT-BR CSV without clinical fields',()=>{const text=new TextDecoder().decode(buildAdministrativeCsv(rows));expect(text).toContain('Data;Categoria;Descrição;Valor (R$);Status');expect(text).toContain('123,45');expect(text.toLowerCase()).not.toContain('clin')})
 it('creates a valid XLSX zip package with worksheet metadata',()=>{const bytes=buildAdministrativeXlsx(rows);expect(Array.from(bytes.slice(0,4))).toEqual([0x50,0x4b,0x03,0x04]);expect(new TextDecoder().decode(bytes)).toContain('xl/worksheets/sheet1.xml')})
 it('creates a PDF payload',async()=>{const result=await buildAdministrativeExport('pdf',rows,'2026-09-01 a 2026-09-30');expect(result.extension).toBe('pdf');expect(new TextDecoder().decode(result.content.slice(0,5))).toBe('%PDF-')})
})
