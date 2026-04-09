import { useMemo, useRef, useState } from 'react'
import { usePageTitle } from '../application/usePageTitle'
import { ExportButton } from './components/ExportButton'

type ParsedInsert = {
  tableName: string
  columns: string[]
  rows: string[][]
}

const defaultColumns = ['id', 'name']
const defaultRows = [
  ['1', 'Alice'],
  ['2', 'Bob'],
]

export function SqlTableEditorApp() {
  usePageTitle('Table → SQL')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tableName, setTableName] = useState<string>('users')
  const [columns, setColumns] = useState<string[]>(defaultColumns)
  const [rows, setRows] = useState<string[][]>(defaultRows)
  const [importMessage, setImportMessage] = useState<string>('')
  const [selectedFileName, setSelectedFileName] = useState<string>('No file selected')

  const generatedSql = useMemo(
    () => buildInsertSql({ tableName, columns, rows }),
    [columns, rows, tableName]
  )

  function addColumn() {
    setColumns((prev) => [...prev, `column_${prev.length + 1}`])
    setRows((prev) => prev.map((row) => [...row, '']))
  }

  function removeColumn(index: number) {
    setColumns((prev) => prev.filter((_, i) => i !== index))
    setRows((prev) => prev.map((row) => row.filter((_, i) => i !== index)))
  }

  function updateColumn(index: number, value: string) {
    setColumns((prev) => prev.map((col, i) => (i === index ? value : col)))
  }

  function addRow() {
    setRows((prev) => [...prev, Array(columns.length).fill('')])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setRows((prev) =>
      prev.map((row, r) => (r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row))
    )
  }

  async function importSqlFile(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseInsertSql(text)
      setTableName(parsed.tableName)
      setColumns(parsed.columns)
      setRows(parsed.rows)
      setSelectedFileName(file.name)
      setImportMessage(`Imported ${file.name} successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import SQL file.'
      setImportMessage(message)
    }
  }



  return (
    <section className="panel sqlTableEditorPanel">
      <h2>SQL Table Editor</h2>
      <p className="hint">
        Add columns/rows manually or import an INSERT SQL file, edit values, then generate/download updated SQL.
      </p>
      <div className="sqlTableEditorTop">
        <div className="row">
          <label className="field">
            <span>Table name</span>
            <input
              data-testid="sql-table-editor-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g. users"
            />
          </label>
          <label className="field">
            <span>Import SQL file</span>
            <div className="filePicker">
              <input
                ref={fileInputRef}
                className="fileInputHidden"
                type="file"
                accept=".sql,text/plain"
                onChange={(e) => void importSqlFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="secondary filePickerButton"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose SQL file
              </button>
              <span className="fileNameText">{selectedFileName}</span>
            </div>
          </label>
        </div>

        <div className="actions">
          <button type="button" className="secondary" onClick={addColumn}>
            + Add column
          </button>
          <button type="button" className="secondary" onClick={addRow}>
            + Add row
          </button>
        </div>

        {importMessage ? <p className="hint">{importMessage}</p> : null}
      </div>

      <div className="sqlTableRowsSection">
        <div className="tableContainer">
          <table className="dataGrid">
            <thead>
              <tr>
                {columns.map((column, colIdx) => (
                  <th key={`${column}-${colIdx}`}>
                    <div className="gridHeaderCell">
                      <input
                        value={column}
                        onChange={(e) => updateColumn(colIdx, e.target.value)}
                        placeholder={`column_${colIdx + 1}`}
                      />
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeColumn(colIdx)}
                        disabled={columns.length <= 1}
                      >
                        -
                      </button>
                    </div>
                  </th>
                ))}
                <th>Row</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={`row-${rowIdx}`}>
                  {columns.map((_, colIdx) => (
                    <td key={`cell-${rowIdx}-${colIdx}`}>
                      <input
                        value={row[colIdx] ?? ''}
                        onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                        placeholder="value"
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeRow(rowIdx)}
                      disabled={rows.length <= 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sqlTableEditorBottom">
        <label className="field">
          <span>Generated INSERT SQL</span>
          <textarea value={generatedSql} readOnly rows={8} />
        </label>

        <div className="actions">
          <button
            type="button"
            className="copy"
            onClick={() => navigator.clipboard.writeText(generatedSql)}
            disabled={!generatedSql}
          >
            Copy SQL
          </button>
          <ExportButton content={generatedSql} filenameBase={sanitizeIdentifier(tableName) || 'query'} disabled={!generatedSql} label="Download" />
        </div>
      </div>
    </section>
  )
}

function buildInsertSql(input: ParsedInsert): string {
  const tableName = sanitizeIdentifier(input.tableName)
  const validColumns = input.columns.map(sanitizeIdentifier).filter(Boolean)
  if (!tableName || validColumns.length === 0) return ''

  const rows = input.rows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => row.slice(0, validColumns.length).map((cell) => toSqlLiteral(cell ?? '')))

  if (rows.length === 0) return ''

  const valuesSql = rows.map((row) => `(${row.join(', ')})`).join(',\n')
  return `INSERT INTO ${tableName} (${validColumns.join(', ')})\nVALUES\n${valuesSql};`
}

function toSqlLiteral(raw: string): string {
  const value = raw.trim()
  if (!value) return "''"
  if (/^null$/i.test(value)) return 'NULL'
  if (/^-?\d+(\.\d+)?$/.test(value)) return value
  return `'${value.replaceAll("'", "''")}'`
}

function sanitizeIdentifier(input: string): string {
  return input.trim().replace(/[^\w$]/g, '')
}

function parseInsertSql(sql: string): ParsedInsert {
  const match = sql.match(
    /insert\s+into\s+([a-zA-Z_][\w$]*)\s*\(([^)]+)\)\s*values\s*([\s\S]+?);?\s*$/i
  )
  if (!match) {
    throw new Error('Only INSERT INTO ... (...) VALUES (...),(...); format is supported for import.')
  }

  const [, tableName, columnPart, valuesPart] = match
  const columns = columnPart.split(',').map((col) => sanitizeIdentifier(col)).filter(Boolean)
  if (!columns.length) throw new Error('No valid columns found in the SQL file.')

  const tupleStrings = splitTuples(valuesPart)
  const rows = tupleStrings.map((tuple) => parseTupleValues(tuple, columns.length))
  if (!rows.length) throw new Error('No VALUES rows found in the SQL file.')

  return {
    tableName: sanitizeIdentifier(tableName),
    columns,
    rows,
  }
}

function splitTuples(input: string): string[] {
  const tuples: string[] = []
  let depth = 0
  let start = -1
  let inSingleQuote = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    const next = input[i + 1]
    if (char === "'" && inSingleQuote && next === "'") {
      i += 1
      continue
    }
    if (char === "'") {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (inSingleQuote) continue
    if (char === '(') {
      if (depth === 0) start = i + 1
      depth += 1
    } else if (char === ')') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        tuples.push(input.slice(start, i))
      }
    }
  }

  return tuples
}

function parseTupleValues(tupleContent: string, expectedColumns: number): string[] {
  const values: string[] = []
  let current = ''
  let inSingleQuote = false

  for (let i = 0; i < tupleContent.length; i += 1) {
    const char = tupleContent[i]
    const next = tupleContent[i + 1]
    if (char === "'" && inSingleQuote && next === "'") {
      current += "'"
      i += 1
      continue
    }
    if (char === "'") {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (char === ',' && !inSingleQuote) {
      values.push(normalizeImportedValue(current))
      current = ''
      continue
    }
    current += char
  }
  values.push(normalizeImportedValue(current))

  if (values.length !== expectedColumns) {
    throw new Error('Imported SQL row column count does not match header column count.')
  }

  return values
}

function normalizeImportedValue(value: string): string {
  const trimmed = value.trim()
  if (/^null$/i.test(trimmed)) return 'NULL'
  return trimmed
}
