import type {
  DatasetFormatSettings,
  DatasetFormatter,
} from '../../domain/dataset/DatasetFormatter'

export class LineJoinDatasetFormatter implements DatasetFormatter {
  format(input: string, settings: DatasetFormatSettings): string {
    const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalized.split('\n')

    const processed = lines
      .map((line) => (settings.trimWhitespace ? line.trim() : line))
      .filter((line) => (settings.removeEmptyLines ? line.trim().length > 0 : true))
    const deduped = settings.removeDuplicates
      ? settings.dedupeCaseInsensitive
        ? dedupeCaseInsensitive(processed)
        : Array.from(new Set(processed))
      : processed
    const ordered = settings.sortAscending
      ? [...deduped].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      : deduped
    const quoted = ordered.map((line) => {
      const escaped = maybeEscapeQuotes(line, settings)
      if (settings.quoteStyle === 'single') return `'${escaped}'`
      if (settings.quoteStyle === 'double') return `"${escaped}"`
      return escaped
    })

    const joined = quoted.join(settings.delimiter)
    if (!joined) return ''
    if (settings.wrapOutput === 'paren') return `(${joined})`
    if (settings.wrapOutput === 'in') return `IN (${joined})`
    return joined
  }
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = value.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function maybeEscapeQuotes(value: string, settings: DatasetFormatSettings): string {
  if (!settings.escapeQuotes) return value
  if (settings.quoteStyle === 'single') return value.replaceAll("'", "''")
  if (settings.quoteStyle === 'double') return value.replaceAll('"', '""')
  return value
}

