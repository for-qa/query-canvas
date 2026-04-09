/**
 * Exports content in multiple file formats: .sql, .csv, .xlsx, .txt
 */
import * as XLSX from 'xlsx'

export type ExportFormat = 'sql' | 'csv' | 'xlsx' | 'txt'

function safeName(filenameBase: string): string {
  return (
    filenameBase
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9_-]/g, '_')
      .replaceAll(/_+/g, '_')
      .replaceAll(/^_+|_+$/g, '') || 'query'
  )
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportFile(
  content: string,
  filenameBase: string,
  format: ExportFormat
): void {
  if (!content.trim()) return
  const base = safeName(filenameBase)

  switch (format) {
    case 'sql': {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      triggerDownload(blob, `${base}.sql`)
      break
    }
    case 'txt': {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      triggerDownload(blob, `${base}.txt`)
      break
    }
    case 'csv': {
      // Wrap the SQL in a single CSV column so it opens cleanly in Excel / Sheets
      const escaped = `"${content.replaceAll('"', '""')}"`
      const blob = new Blob([escaped], { type: 'text/csv;charset=utf-8' })
      triggerDownload(blob, `${base}.csv`)
      break
    }
    case 'xlsx': {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([['SQL Output'], [content]])
      // Make the column wide enough to be readable
      ws['!cols'] = [{ wch: 120 }]
      XLSX.utils.book_append_sheet(wb, ws, 'SQL')
      XLSX.writeFile(wb, `${base}.xlsx`)
      break
    }
  }
}
