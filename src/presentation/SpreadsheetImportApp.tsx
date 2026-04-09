import { useState, useCallback, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { usePageTitle } from '../application/usePageTitle'
import { useQueryHistory } from '../application/useQueryHistory'
import { ExportButton } from './components/ExportButton'
import { SqlHighlighter } from './components/SqlHighlighter'
import { useDialect } from './DialectContext'
import { quoteIdentifier } from '../domain/sql/SqlDialect'

type QueryMode = 'select' | 'insert'
type SheetRow = Record<string, string>

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: SheetRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const firstLine = lines[0]
  let delim = ','
  if ((firstLine.match(/\t/g) ?? []).length > (firstLine.match(/,/g) ?? []).length) delim = '\t'
  else if ((firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length) delim = ';'
  else if ((firstLine.match(/\|/g) ?? []).length > (firstLine.match(/,/g) ?? []).length) delim = '|'

  const splitLine = (line: string) =>
    line.split(delim).map((v) => v.trim().replace(/^["']|["']$/g, ''))

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const vals = splitLine(line)
    const row: SheetRow = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })

  return { headers, rows }
}

// ── Extract one named sheet from a workbook ───────────────────────────────────
function extractSheet(wb: XLSX.WorkBook, sheetName: string): { headers: string[]; rows: SheetRow[] } {
  const ws = wb.Sheets[sheetName]
  if (!ws) return { headers: [], rows: [] }

  const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  if (jsonData.length === 0) return { headers: [], rows: [] }

  const headers = (jsonData[0] as string[]).map((h) => String(h ?? '').trim()).filter(Boolean)
  const rows = jsonData.slice(1).map((rowArr) => {
    const row: SheetRow = {}
    headers.forEach((h, i) => { row[h] = String((rowArr as string[])[i] ?? '').trim() })
    return row
  })

  return { headers, rows }
}

// ── SQL value formatter ───────────────────────────────────────────────────────
function toSqlValue(val: string): string {
  if (val === '' || val.toLowerCase() === 'null') return 'NULL'
  if (!Number.isNaN(Number(val)) && val !== '') return val
  return `'${val.replaceAll("'", "''")}'`
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SpreadsheetImportApp() {
  usePageTitle('Spreadsheet → SQL')
  const { addEntry } = useQueryHistory()
  const { dialect } = useDialect()

  // File state
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<SheetRow[]>([])
  const [fileName, setFileName] = useState('')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // SQL options
  const [tableName, setTableName] = useState('my_table')
  const [queryMode, setQueryMode] = useState<QueryMode>('insert')
  const [quoteId, setQuoteId] = useState(false)
  const [includeSemicolon, setIncludeSemicolon] = useState(true)
  const [insertMode, setInsertMode] = useState<'bulk' | 'multiple'>('bulk')

  // Column selection
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set())
  const [generated, setGenerated] = useState(false)
  const [sqlOutput, setSqlOutput] = useState('')

  // ── Sheet switching (XLSX only) ──────────────────────────────────────────
  const switchSheet = useCallback((wb: XLSX.WorkBook, sheet: string) => {
    const { headers: h, rows: r } = extractSheet(wb, sheet)
    if (h.length === 0) { setError(`Sheet "${sheet}" appears to be empty.`); return }
    setError('')
    setActiveSheet(sheet)
    setHeaders(h)
    setRows(r)
    setSelectedCols(new Set(h))
    setGenerated(false)
    setSqlOutput('')
  }, [])

  // ── File processing ──────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    setError('')
    setGenerated(false)
    setSqlOutput('')
    setWorkbook(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.')
      return
    }

    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    setFileName(file.name)

    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const { headers: h, rows: r } = parseCsv(text)
        if (h.length === 0) { setError('No data found in file.'); return }
        setHeaders(h)
        setRows(r)
        setSelectedCols(new Set(h))
        setTableName(baseName)
        setSheetNames([])
        setActiveSheet('')
      }
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer
        const wb = XLSX.read(buffer, { type: 'array' })
        setWorkbook(wb)
        setSheetNames(wb.SheetNames)
        const firstSheet = wb.SheetNames[0]
        setTableName(baseName)
        switchSheet(wb, firstSheet)
      }
      reader.readAsArrayBuffer(file)
    }
  }, [switchSheet])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  function clearAll() {
    setWorkbook(null)
    setFileName('')
    setHeaders([])
    setRows([])
    setSheetNames([])
    setActiveSheet('')
    setSqlOutput('')
    setGenerated(false)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Column toggle ────────────────────────────────────────────────────────
  function toggleCol(col: string) {
    setSelectedCols((prev) => {
      const next = new Set(prev)
      if (next.has(col)) { if (next.size > 1) next.delete(col) }
      else next.add(col)
      return next
    })
  }

  function toggleAllCols() {
    if (selectedCols.size === headers.length) {
      setSelectedCols(new Set([headers[0]]))
    } else {
      setSelectedCols(new Set(headers))
    }
  }

  // ── SQL generation ───────────────────────────────────────────────────────
  const activeCols = useMemo(() => headers.filter((h) => selectedCols.has(h)), [headers, selectedCols])

  function generateSql() {
    if (!tableName.trim() || rows.length === 0 || activeCols.length === 0) return

    const tbl = quoteId ? quoteIdentifier(tableName.trim(), dialect) : tableName.trim()
    const cols = activeCols.map((c) => (quoteId ? quoteIdentifier(c, dialect) : c))
    const semi = includeSemicolon ? ';' : ''

    let sql = ''

    if (queryMode === 'select') {
      sql = `SELECT ${cols.join(', ')}\nFROM ${tbl}${semi}`
    } else {
      if (insertMode === 'bulk') {
        const valueSets = rows.map((row) => {
          const vals = activeCols.map((c) => toSqlValue(row[c] ?? ''))
          return `  (${vals.join(', ')})`
        })
        sql = `INSERT INTO ${tbl} (${cols.join(', ')})\nVALUES\n${valueSets.join(',\n')}${semi}`
      } else {
        sql = rows.map((row) => {
          const vals = activeCols.map((c) => toSqlValue(row[c] ?? ''))
          return `INSERT INTO ${tbl} (${cols.join(', ')}) VALUES (${vals.join(', ')})${semi}`
        }).join('\n')
      }
    }

    setSqlOutput(sql)
    setGenerated(true)
    const sheetLabel = activeSheet ? ` [${activeSheet}]` : ''
    addEntry(sql, `Spreadsheet${sheetLabel} → ${queryMode.toUpperCase()} (${tableName})`)
  }

  const hasData = headers.length > 0 && rows.length > 0
  const hasMultipleSheets = sheetNames.length > 1

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Spreadsheet → SQL</h2>
      <p className="hint" style={{ marginBottom: '1.5rem' }}>
        Upload a <code>.csv</code> or <code>.xlsx</code> file — preview your data, pick a sheet, select columns, then generate SQL instantly.
      </p>

      {/* ── Drop zone ── */}
      <div
        className={`spreadsheetDropzone${isDragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload spreadsheet file"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <div className="spreadsheetDropzoneIcon">📂</div>
        <div className="spreadsheetDropzoneText">
          {fileName
            ? <>
                <strong>{fileName}</strong><br />
                <span>
                  {rows.length} rows · {headers.length} columns
                  {hasMultipleSheets ? ` · ${sheetNames.length} sheets` : ''}
                </span>
              </>
            : <><strong>Drop your file here</strong> or click to browse<br /><span>Supports .csv, .xlsx, .xls</span></>}
        </div>
        {fileName && (
          <button
            type="button"
            className="secondary"
            style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
            onClick={(e) => { e.stopPropagation(); clearAll() }}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Sheet Selector (XLSX multi-sheet) ── */}
      {hasMultipleSheets && workbook && (
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--heading)' }}>
              Sheet / Tab
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>— {sheetNames.length} sheets detected</span>
          </div>
          <div className="sheetTabBar">
            {sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                className={`sheetTab${activeSheet === name ? ' active' : ''}`}
                onClick={() => switchSheet(workbook, name)}
                title={`Switch to sheet: ${name}`}
              >
                🗂 {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Data Preview Table ── */}
      {hasData && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-h)' }}>
              Data Preview
              {activeSheet && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', fontWeight: 400, color: 'var(--accent)', background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: '6px', padding: '0.1rem 0.45rem' }}>
                  {activeSheet}
                </span>
              )}
              <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {rows.length} rows · showing first {Math.min(rows.length, 50)}
              </span>
            </h3>
          </div>
          <div className="spreadsheetTableWrap">
            <table className="spreadsheetTable">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>
                      <label className="colToggle" title={selectedCols.has(h) ? 'Click to deselect column' : 'Click to select column'}>
                        <input
                          type="checkbox"
                          checked={selectedCols.has(h)}
                          onChange={() => toggleCol(h)}
                        />
                        <span>{h}</span>
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'alt'}>
                    {headers.map((h) => (
                      <td key={h} className={selectedCols.has(h) ? '' : 'dimmed'}>
                        {row[h] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
              Showing 50 of {rows.length} rows. All rows will be included in generated SQL.
            </p>
          )}
        </div>
      )}

      {/* ── SQL Options ── */}
      {hasData && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="divider" />
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-h)', margin: '1rem 0 0.75rem' }}>SQL Options</h3>

          <div className="row" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <label className="field">
              <span>Table Name</span>
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g. my_table"
              />
            </label>

            <label className="field small">
              <span>Query Type</span>
              <select value={queryMode} onChange={(e) => setQueryMode(e.target.value as QueryMode)}>
                <option value="insert">INSERT (populate table)</option>
                <option value="select">SELECT (read columns)</option>
              </select>
            </label>

            {queryMode === 'insert' && (
              <label className="field small">
                <span>INSERT Syntax</span>
                <select value={insertMode} onChange={(e) => setInsertMode(e.target.value as 'bulk' | 'multiple')}>
                  <option value="bulk">Bulk (VALUES (),(…))</option>
                  <option value="multiple">Multiple (INSERT …; INSERT…)</option>
                </select>
              </label>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label className="checkbox">
              <input type="checkbox" checked={quoteId} onChange={(e) => setQuoteId(e.target.checked)} />
              <span>Quote identifiers</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={includeSemicolon} onChange={(e) => setIncludeSemicolon(e.target.checked)} />
              <span>Include semicolon</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Using <strong style={{ color: 'var(--text-h)' }}>{selectedCols.size}</strong> of {headers.length} columns
              </span>
              <button type="button" className="secondary" style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem' }} onClick={toggleAllCols}>
                {selectedCols.size === headers.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Toggle columns in the table header above to include/exclude them.
            </p>
          </div>

          <button
            type="button"
            className="copy"
            style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', marginBottom: '0.5rem' }}
            onClick={generateSql}
            disabled={!tableName.trim() || activeCols.length === 0}
          >
            ⚡ Generate {queryMode === 'insert' ? 'INSERT' : 'SELECT'} Query
            {activeSheet ? ` from "${activeSheet}"` : ''}
          </button>
        </div>
      )}

      {/* ── SQL Output ── */}
      {generated && sqlOutput && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="divider" />
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-h)', margin: '1rem 0 0.75rem' }}>Generated SQL</h3>
          <div className="field sqlQueryOutputField">
            <SqlHighlighter code={sqlOutput} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="copy"
              style={{ flex: 1 }}
              onClick={() => { void navigator.clipboard.writeText(sqlOutput) }}
            >
              Copy SQL
            </button>
            <ExportButton content={sqlOutput} filenameBase={`${tableName}_${activeSheet || queryMode}`} label="Download" />
          </div>
        </div>
      )}
    </section>
  )
}
