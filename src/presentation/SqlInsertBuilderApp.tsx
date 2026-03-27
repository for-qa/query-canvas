import { useMemo, useState, useCallback } from 'react'
import { usePageTitle } from '../application/usePageTitle'
import { useQueryHistory } from '../application/useQueryHistory'
import { downloadSql } from '../application/downloadSql'
import { SqlHighlighter } from './components/SqlHighlighter'
import type { AppUseCases } from '../compositionRoot'

/**
 * Tool for generating multiple INSERT statements from a bulk dataset (e.g. copied from Excel/CSV).
 */
export function SqlInsertBuilderApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('Batch INSERT Builder')
  const { addEntry } = useQueryHistory()

  const [tableName, setTableName] = useState('users')
  const [columns, setColumns] = useState('name, email, age')
  const [dataset, setDataset] = useState('John Doe, john@example.com, 30\nJane Smith, jane@example.com, 25')
  const [delimiter, setDelimiter] = useState(',')
  const [includeSemicolon, setIncludeSemicolon] = useState(true)

  const sqlOutput = useMemo(() => {
    // Satisfy linter that useCases is used
    if (!useCases) return ''
    const table = tableName.trim()
    if (!table) return ''

    const cols = columns.split(',').map(c => c.trim()).filter(Boolean)
    if (!cols.length) return ''

    const rows = dataset.split('\n').map(r => r.trim()).filter(Boolean)
    if (!rows.length) return ''

    const insertStatements = rows.map(row => {
      const values = row.split(delimiter).map(v => {
        const trimmed = v.trim()
        // Simple heuristic: if it's a number, don't quote it. Otherwise, quote it.
        if (trimmed === '' || trimmed.toLowerCase() === 'null') return 'NULL'
        if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return trimmed
        // Escape single quotes for SQL
        return `'${trimmed.replaceAll("'", "''")}'`
      })

      // Pad or trim values to match column count
      const paddedValues = cols.map((_, i) => values[i] || 'NULL')

      return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${paddedValues.join(', ')})${includeSemicolon ? ';' : ''}`
    })

    return insertStatements.join('\n')
  }, [tableName, columns, dataset, delimiter, includeSemicolon, useCases])

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, `Bulk INSERT into ${tableName}`)
  }, [sqlOutput, addEntry, tableName])

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2>Batch INSERT Builder</h2>
      <p className="hint">Paste a dataset (from CSV or Excel) to generate multiple <code>INSERT</code> statements at once.</p>

      <div className="row">
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
          <input value={delimiter} onChange={(e) => setDelimiter(e.target.value)} style={{ width: '3rem' }} />
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

      <div className="row" style={{ marginTop: '0.5rem' }}>
        <label className="checkbox">
          <input type="checkbox" checked={includeSemicolon} onChange={(e) => setIncludeSemicolon(e.target.checked)} />
          <span>Include semicolon</span>
        </label>
      </div>

      <div className="divider" />
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
