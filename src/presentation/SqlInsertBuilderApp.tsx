import { useMemo, useState, useCallback } from 'react'
import { usePageTitle } from '../application/usePageTitle'
import { useQueryHistory } from '../application/useQueryHistory'
import { downloadSql } from '../application/downloadSql'
import { SqlHighlighter } from './components/SqlHighlighter'
import { useDialect } from './DialectContext'
import { quoteIdentifier } from '../domain/sql/SqlDialect'
import type { AppUseCases } from '../compositionRoot'

/**
 * Tool for generating INSERT statements from a bulk dataset (e.g. copied from Excel/CSV).
 */
function detectDelimiter(delimiter: string, dataset: string): string {
  let activeDelimiter = delimiter
  if (!activeDelimiter && dataset) {
    const firstLine = dataset.split('\n')[0] || ''
    if (firstLine.includes('\t')) activeDelimiter = '\t'
    else if (firstLine.includes('|')) activeDelimiter = '|'
    else if (firstLine.includes(';')) activeDelimiter = ';'
    else activeDelimiter = ','
  } else if (!activeDelimiter) {
    activeDelimiter = ','
  }
  if (activeDelimiter.toLowerCase() === String.raw`\t`) activeDelimiter = '\t'
  return activeDelimiter
}

function processInsertRows(
  rawRows: string[], cols: string[], activeDelimiter: string, ignoreFirstRow: boolean, warns: string[]
) {
  return rawRows.map((row, index) => {
    const values = row.split(activeDelimiter).map(v => {
      const trimmed = v.trim()
      if (trimmed === '' || trimmed.toLowerCase() === 'null') return 'NULL'
      if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return trimmed
      return `'${trimmed.replaceAll("'", "''")}'`
    })

    if (values.length !== cols.length && warns.length < 3) {
      warns.push(`Row ${index + (ignoreFirstRow ? 2 : 1)} has ${values.length} value(s), but there are ${cols.length} column(s).`)
    }

    return cols.map((_, i) => values[i] || 'NULL')
  })
}

export function SqlInsertBuilderApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('Batch INSERT Builder')
  const { addEntry } = useQueryHistory()
  const { dialect } = useDialect()

  const [tableName, setTableName] = useState('users')
  const [columns, setColumns] = useState('name, email, age')
  const [dataset, setDataset] = useState('John Doe, john@example.com, 30\nJane Smith, jane@example.com, 25')
  const [delimiter, setDelimiter] = useState(',')
  
  // Options
  const [insertMode, setInsertMode] = useState<'bulk' | 'multiple'>('multiple')
  const [ignoreFirstRow, setIgnoreFirstRow] = useState(false)
  const [quoteId, setQuoteId] = useState(false)
  const [includeSemicolon, setIncludeSemicolon] = useState(true)

  const { sqlOutput, warnings } = useMemo(() => {
    if (!useCases) return { sqlOutput: '', warnings: [] }
    
    const table = tableName.trim()
    const warns: string[] = []
    
    if (!table) return { sqlOutput: '', warnings: [] }

    const activeDelimiter = detectDelimiter(delimiter, dataset)

    const cols = columns.split(',').map(c => c.trim()).filter(Boolean)
    if (!cols.length) return { sqlOutput: '', warnings: [] }

    const formattedTable = quoteId ? quoteIdentifier(table, dialect) : table
    const formattedCols = cols.map(c => quoteId ? quoteIdentifier(c, dialect) : c)

    let rawRows = dataset.split('\n').map(r => r.trim()).filter(Boolean)
    if (ignoreFirstRow && rawRows.length > 0) rawRows = rawRows.slice(1)
    if (!rawRows.length) return { sqlOutput: '', warnings: [] }

    const parsedValuesList = processInsertRows(rawRows, cols, activeDelimiter, ignoreFirstRow, warns)

    if (warns.length > 0) warns.push(`(Some values will be artificially padded with NULL or ignored)`)

    let finalSql = ''

    if (insertMode === 'bulk') {
      const valuesSql = parsedValuesList.map(vals => `  (${vals.join(', ')})`).join(',\n')
      finalSql = `INSERT INTO ${formattedTable} (${formattedCols.join(', ')})\nVALUES\n${valuesSql}${includeSemicolon ? ';' : ''}`
    } else {
      finalSql = parsedValuesList.map(vals => {
        return `INSERT INTO ${formattedTable} (${formattedCols.join(', ')}) VALUES (${vals.join(', ')})${includeSemicolon ? ';' : ''}`
      }).join('\n')
    }

    return { sqlOutput: finalSql, warnings: warns }
  }, [tableName, columns, dataset, delimiter, includeSemicolon, useCases, quoteId, dialect, insertMode, ignoreFirstRow])

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, `Batch INSERT into ${tableName}`)
  }, [sqlOutput, addEntry, tableName])

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2>Batch INSERT Builder</h2>
      <p className="hint">Paste a dataset (from Excel or CSV) to generate massive <code>INSERT</code> workloads instantly.</p>

      <div className="row" style={{ marginBottom: '1.25rem' }}>
        <label className="field">
          <span>Table Name</span>
          <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g. users" />
        </label>
        <label className="field">
          <span>Columns (comma-separated)</span>
          <input value={columns} onChange={(e) => setColumns(e.target.value)} placeholder="e.g. name, email, age" />
        </label>
        <label className="field small">
          <span>Delimiter</span>
          <input value={delimiter} onChange={(e) => setDelimiter(e.target.value)} style={{ width: '4rem' }} placeholder="auto" />
        </label>
      </div>

      <label className="field">
        <span>Paste Dataset (one row per line)</span>
        <textarea
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          rows={8}
          placeholder="John, john@example.com, 30&#10;Jane, jane@example.com, 25"
        />
      </label>

      <div className="row" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <label className="field small">
          <span>Insert syntax</span>
          <select value={insertMode} onChange={(e) => setInsertMode(e.target.value as 'multiple' | 'bulk')} style={{ maxWidth: '200px' }}>
            <option value="multiple">Multiple (INSERT ...; INSERT ...)</option>
            <option value="bulk">Bulk (INSERT ... VALUES (), ())</option>
          </select>
        </label>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '1.2rem' }}>
          <label className="checkbox">
            <input type="checkbox" checked={ignoreFirstRow} onChange={(e) => setIgnoreFirstRow(e.target.checked)} />
            <span>Ignore first row (header)</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={quoteId} onChange={(e) => setQuoteId(e.target.checked)} />
            <span>Quote identifiers</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={includeSemicolon} onChange={(e) => setIncludeSemicolon(e.target.checked)} />
            <span>Include semicolon</span>
          </label>
        </div>
      </div>

      <div className="divider" />

      {/* ── Validation Warnings ───────────────────────────── */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {warnings.map((w) => (
            <div key={w} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.55rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem',
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.3)',
              color: '#fde68a',
            }}>
              <span>⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <SqlHighlighter code={sqlOutput} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="copy" onClick={handleCopy} disabled={!sqlOutput} style={{ flex: 1 }}>
          Copy All SQL
        </button>
        <button type="button" className="secondary" onClick={() => downloadSql(sqlOutput, `batch_insert_${tableName}`)} disabled={!sqlOutput}>
          ⬇ Download .sql
        </button>
      </div>
    </section>
  )
}
