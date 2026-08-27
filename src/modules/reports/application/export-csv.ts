export type ExportCell = string | number | boolean | null
export type ExportTable = { name?: string; columns: string[]; rows: Array<Record<string, ExportCell>> }
export type ExportFile = { filename: string; mimeType: string; content: string | Uint8Array }

function csvCell(value: ExportCell): string {
  const text = value === null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function exportCsv(table: ExportTable): ExportFile {
  const lines = [table.columns.map(csvCell).join(','), ...table.rows.map((row) => table.columns.map((column) => csvCell(row[column] ?? null)).join(','))]
  return { filename: `${table.name ?? 'relatorio'}.csv`, mimeType: 'text/csv;charset=utf-8', content: `\uFEFF${lines.join('\r\n')}\r\n` }
}
