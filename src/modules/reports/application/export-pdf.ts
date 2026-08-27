import type { ExportFile, ExportTable } from './export-csv'

function pdfEscape(value: string): string { return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll(/[^\x20-\x7e]/g, '?') }

export function exportPdf(table: ExportTable): ExportFile {
  const lines = [table.columns.join(' | '), ...table.rows.map((row) => table.columns.map((column) => String(row[column] ?? '')).join(' | '))].slice(0, 42)
  const stream = ['BT', '/F1 10 Tf', '45 750 Td', ...lines.map((line, index) => `${index ? '0 -16 Td ' : ''}(${pdfEscape(line)}) Tj`), 'ET'].join('\n')
  const objects = [`1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj`, `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj`, `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj`, `4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`, `5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`]
  let pdf = '%PDF-1.4\n'; const offsets: number[] = []
  for (const object of objects) { offsets.push(pdf.length); pdf += `${object}\n` }
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return { filename: `${table.name ?? 'relatorio'}.pdf`, mimeType: 'application/pdf', content: new TextEncoder().encode(pdf) }
}
