/**
 * Triggers a browser download of `content` as a `.sql` file.
 * Sanitises the filename so it only contains safe characters.
 */
export function downloadSql(content: string, filenameBase: string = 'query'): void {
  if (!content.trim()) return
  const safe = filenameBase
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/^_+|_+$/g, '') || 'query'

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safe}.sql`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
