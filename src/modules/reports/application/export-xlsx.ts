import type { ExportFile, ExportTable } from './export-csv'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files: Array<[string, string]>): Uint8Array {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const write32 = (view: DataView, at: number, value: number) => view.setUint32(at, value >>> 0, true)
  const write16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true)

  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(text)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const localView = new DataView(local.buffer)
    write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0); write16(localView, 8, 0); write16(localView, 10, 0); write16(localView, 12, 0)
    write32(localView, 14, crc); write32(localView, 18, data.length); write32(localView, 22, data.length); write16(localView, 26, nameBytes.length); write16(localView, 28, 0)
    local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); parts.push(local)
    const directory = new Uint8Array(46 + nameBytes.length); const directoryView = new DataView(directory.buffer)
    write32(directoryView, 0, 0x02014b50); write16(directoryView, 4, 20); write16(directoryView, 6, 20); write16(directoryView, 8, 0); write16(directoryView, 10, 0); write16(directoryView, 12, 0); write16(directoryView, 14, 0)
    write32(directoryView, 16, crc); write32(directoryView, 20, data.length); write32(directoryView, 24, data.length); write16(directoryView, 28, nameBytes.length); write16(directoryView, 30, 0); write16(directoryView, 32, 0); write16(directoryView, 34, 0); write16(directoryView, 36, 0); write32(directoryView, 38, 0); write32(directoryView, 42, offset)
    directory.set(nameBytes, 46); central.push(directory); offset += local.length
  }
  const centralBytes = central.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22); const endView = new DataView(end.buffer)
  write32(endView, 0, 0x06054b50); write16(endView, 8, files.length); write16(endView, 10, files.length); write32(endView, 12, centralBytes); write32(endView, 16, offset)
  const result = new Uint8Array(offset + centralBytes + end.length); let cursor = 0
  for (const part of parts) { result.set(part, cursor); cursor += part.length }
  for (const part of central) { result.set(part, cursor); cursor += part.length }
  result.set(end, cursor)
  return result
}

export function exportXlsx(table: ExportTable): ExportFile {
  const rows = [table.columns, ...table.rows.map((row) => table.columns.map((column) => row[column] ?? ''))]
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`
  const content = zipStore([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', sheet],
  ])
  return { filename: `${table.name ?? 'relatorio'}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content }
}
