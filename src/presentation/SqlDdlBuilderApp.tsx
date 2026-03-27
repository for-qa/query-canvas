import { useMemo, useState, useCallback } from 'react'
import type {
  SqlColumnType,
  SqlCreateTableColumn,
  SqlCreateTableQuery,
  SqlCreateDatabaseQuery,
  SqlDropTableQuery,
  SqlDropDatabaseQuery,
  SqlTruncateQuery,
} from '../domain/sql/SqlModels'
import type { AppUseCases } from '../compositionRoot'
import { useDialect } from './DialectContext'
import { usePageTitle } from '../application/usePageTitle'
import { downloadSql } from '../application/downloadSql'
import { useQueryHistory } from '../application/useQueryHistory'
import { SqlHighlighter } from './components/SqlHighlighter'
import { parseCreateTable } from '../application/schemaParser'

type ColumnDraft = SqlCreateTableColumn & { id: string }
type DdlMode = 'table' | 'database' | 'drop-table' | 'drop-database' | 'truncate'

const columnTypes: SqlColumnType[] = [
  'INT', 'BIGINT', 'SMALLINT', 'DECIMAL', 'FLOAT', 'DOUBLE',
  'VARCHAR', 'TEXT', 'CHAR', 'BOOLEAN', 'DATE', 'DATETIME',
  'TIMESTAMP', 'TIME', 'JSON', 'UUID',
]
const lengthTypes = new Set(['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE'])

function defaultColumn(): ColumnDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'VARCHAR',
    length: '255',
    nullable: true,
    primaryKey: false,
    unique: false,
    defaultValue: '',
    autoIncrement: false,
  }
}

function stripId(col: ColumnDraft): SqlCreateTableColumn {
  return {
    name: col.name,
    type: col.type,
    length: col.length,
    nullable: col.nullable,
    primaryKey: col.primaryKey,
    unique: col.unique,
    defaultValue: col.defaultValue,
    autoIncrement: col.autoIncrement,
  }
}

const MODE_LABELS: Record<DdlMode, string> = {
  table: 'CREATE TABLE',
  database: 'CREATE DATABASE',
  'drop-table': 'DROP TABLE',
  'drop-database': 'DROP DATABASE',
  truncate: 'TRUNCATE TABLE',
}

export function SqlDdlBuilderApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('DDL Builder')
  const { dialect } = useDialect()
  const { addEntry } = useQueryHistory()
  const [mode, setMode] = useState<DdlMode>('table')
  
  const [importString, setImportString] = useState('')
  const [showImport, setShowImport] = useState(false)

  const handleImport = useCallback(() => {
    if (!importString.trim()) return
    const parsed = parseCreateTable(importString)
    if (parsed) {
      setTableName(parsed.tableName)
      setColumns(parsed.columns.map(col => ({ ...col, id: crypto.randomUUID() })))
      setTableIfNotExists(parsed.ifNotExists)
      setTableIncludeSemicolon(parsed.includeSemicolon)
      setShowImport(false)
      setImportString('')
      alert('Schema imported successfully!')
    } else {
      alert('Could not parse CREATE TABLE. Check the format.')
    }
  }, [importString])

  // ── CREATE TABLE state ──────────────────────────────────────────────────────
  const [tableName, setTableName] = useState('users')
  const [columns, setColumns] = useState<ColumnDraft[]>([
    { id: crypto.randomUUID(), name: 'id', type: 'INT', nullable: false, primaryKey: true, unique: false, defaultValue: '', autoIncrement: true },
    { id: crypto.randomUUID(), name: 'name', type: 'VARCHAR', length: '255', nullable: false, primaryKey: false, unique: false, defaultValue: '', autoIncrement: false },
  ])
  const [tableIfNotExists, setTableIfNotExists] = useState(true)
  const [tableIncludeSemicolon, setTableIncludeSemicolon] = useState(true)

  // ── CREATE DATABASE state ───────────────────────────────────────────────────
  const [dbName, setDbName] = useState('my_database')
  const [dbIfNotExists, setDbIfNotExists] = useState(true)
  const [dbCharSet, setDbCharSet] = useState('utf8mb4')
  const [dbCollation, setDbCollation] = useState('utf8mb4_unicode_ci')
  const [dbIncludeSemicolon, setDbIncludeSemicolon] = useState(true)

  // ── DROP TABLE state ────────────────────────────────────────────────────────
  const [dropTableName, setDropTableName] = useState('')
  const [dropTableIfExists, setDropTableIfExists] = useState(true)
  const [dropTableSemicolon, setDropTableSemicolon] = useState(true)

  // ── DROP DATABASE state ─────────────────────────────────────────────────────
  const [dropDbName, setDropDbName] = useState('')
  const [dropDbIfExists, setDropDbIfExists] = useState(true)
  const [dropDbSemicolon, setDropDbSemicolon] = useState(true)

  // ── TRUNCATE state ──────────────────────────────────────────────────────────
  const [truncateName, setTruncateName] = useState('')
  const [truncateSemicolon, setTruncateSemicolon] = useState(true)

  // ── Computed SQL ────────────────────────────────────────────────────────────
  const sqlOutput = useMemo(() => {
    switch (mode) {
      case 'table': {
        const q: SqlCreateTableQuery = {
          tableName, columns: columns.map(stripId),
          ifNotExists: tableIfNotExists, dialect, includeSemicolon: tableIncludeSemicolon,
        }
        return useCases.buildDdl.executeCreateTable(q)
      }
      case 'database': {
        const q: SqlCreateDatabaseQuery = {
          databaseName: dbName, ifNotExists: dbIfNotExists,
          characterSet: dbCharSet, collation: dbCollation,
          dialect, includeSemicolon: dbIncludeSemicolon,
        }
        return useCases.buildDdl.executeCreateDatabase(q)
      }
      case 'drop-table': {
        const q: SqlDropTableQuery = { tableName: dropTableName, ifExists: dropTableIfExists, dialect, includeSemicolon: dropTableSemicolon }
        return useCases.buildDdl.executeDropTable(q)
      }
      case 'drop-database': {
        const q: SqlDropDatabaseQuery = { databaseName: dropDbName, ifExists: dropDbIfExists, dialect, includeSemicolon: dropDbSemicolon }
        return useCases.buildDdl.executeDropDatabase(q)
      }
      case 'truncate': {
        const q: SqlTruncateQuery = { tableName: truncateName, dialect, includeSemicolon: truncateSemicolon }
        return useCases.buildDdl.executeTruncate(q)
      }
    }
  }, [mode, tableName, columns, tableIfNotExists, tableIncludeSemicolon,
      dbName, dbIfNotExists, dbCharSet, dbCollation, dbIncludeSemicolon,
      dropTableName, dropTableIfExists, dropTableSemicolon,
      dropDbName, dropDbIfExists, dropDbSemicolon,
      truncateName, truncateSemicolon, dialect, useCases])

  const isDestructive = mode === 'drop-table' || mode === 'drop-database' || mode === 'truncate'

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    if (isDestructive && !globalThis.confirm('This is a destructive operation. Are you sure you want to copy this SQL?')) {
      return
    }
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, MODE_LABELS[mode])
  }, [sqlOutput, addEntry, mode, isDestructive])

  const handleDownload = useCallback(() => {
    if (isDestructive && !globalThis.confirm('This is a destructive operation. Are you sure you want to download this SQL?')) {
      return
    }
    downloadSql(sqlOutput, `ddl_${mode}`)
  }, [sqlOutput, mode, isDestructive])

  // ── Column helpers ──────────────────────────────────────────────────────────
  const addColumn = useCallback(() => setColumns((p) => [...p, defaultColumn()]), [])
  const removeColumn = useCallback((id: string) => setColumns((p) => p.filter((c) => c.id !== id)), [])
  const updateColumn = useCallback((id: string, patch: Partial<ColumnDraft>) =>
    setColumns((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c))), [])
  const moveColumn = useCallback((id: string, dir: -1 | 1) =>
    setColumns((p) => {
      const idx = p.findIndex((c) => c.id === id)
      const next = idx + dir
      if (next < 0 || next >= p.length) return p
      const copy = [...p]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      return copy
    }), [])

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2>DDL Builder</h2>
      <p className="hint">Generate CREATE, DROP, and TRUNCATE statements.</p>

      {/* ── Mode buttons ─────────────────────────────────── */}
      <div className="row" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        {(Object.entries(MODE_LABELS) as [DdlMode, string][]).map(([m, label]) => (
          <button key={m} type="button"
            className={mode === m ? 'copy' : 'secondary'}
            style={{ display: 'inline-block', width: 'auto', marginTop: 0, padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => setMode(m)}>
            {label}
          </button>
        ))}
        <button type="button" className="secondary" 
          style={{ width: 'auto', marginTop: 0, padding: '0.5rem 0.9rem', fontSize: '0.85rem', marginLeft: 'auto' }}
          onClick={() => setShowImport(!showImport)}>
          {showImport ? 'Cancel Import' : 'Import from SQL'}
        </button>
      </div>

      {showImport && (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <label className="field">
            <span>Paste <code>CREATE TABLE</code> SQL</span>
            <textarea 
              value={importString} 
              onChange={(e) => setImportString(e.target.value)} 
              rows={5} 
              placeholder="CREATE TABLE users (id INT, name VARCHAR(255));"
            />
          </label>
          <button type="button" className="copy" onClick={handleImport} style={{ marginTop: '0.5rem' }}>Parse & Import Schema</button>
        </div>
      )}

      {/* ── CREATE TABLE ─────────────────────────────────── */}
      {mode === 'table' && (
        <>
          <div className="row">
            <label className="field">
              <span>Table Name</span>
              <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g. users" />
            </label>
            <label className="checkbox"><input type="checkbox" checked={tableIfNotExists} onChange={(e) => setTableIfNotExists(e.target.checked)} /><span>IF NOT EXISTS</span></label>
            <label className="checkbox"><input type="checkbox" checked={tableIncludeSemicolon} onChange={(e) => setTableIncludeSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
          </div>

          <div className="whereHeader">
            <h3>Columns</h3>
            <button type="button" onClick={addColumn}>+ Add column</button>
          </div>

          {columns.map((col, idx) => (
            <div key={col.id} className="conditionRow" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <label className="field small"><span>Name</span><input value={col.name} onChange={(e) => updateColumn(col.id, { name: e.target.value })} placeholder="col_name" /></label>
              <label className="field small">
                <span>Type</span>
                <select value={col.type} onChange={(e) => {
                  const t = e.target.value as SqlColumnType
                  updateColumn(col.id, { type: t, length: lengthTypes.has(t) ? (col.length || '255') : undefined })
                }}>
                  {columnTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              {lengthTypes.has(col.type) && (
                <label className="field small"><span>Length</span><input value={col.length ?? ''} onChange={(e) => updateColumn(col.id, { length: e.target.value })} style={{ width: '5rem' }} /></label>
              )}
              <label className="checkbox"><input type="checkbox" checked={col.primaryKey} onChange={(e) => updateColumn(col.id, { primaryKey: e.target.checked, unique: false })} /><span>PK</span></label>
              <label className="checkbox"><input type="checkbox" checked={!col.nullable} onChange={(e) => updateColumn(col.id, { nullable: !e.target.checked })} /><span>NOT NULL</span></label>
              <label className="checkbox"><input type="checkbox" checked={col.unique} onChange={(e) => updateColumn(col.id, { unique: e.target.checked, primaryKey: false })} /><span>UNIQUE</span></label>
              <label className="checkbox"><input type="checkbox" checked={col.autoIncrement} onChange={(e) => updateColumn(col.id, { autoIncrement: e.target.checked })} /><span>AUTO INC</span></label>
              <label className="field small"><span>Default</span><input value={col.defaultValue ?? ''} onChange={(e) => updateColumn(col.id, { defaultValue: e.target.value })} placeholder="optional" /></label>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-end', marginLeft: 'auto' }}>
                <button type="button" className="secondary" style={{ padding: '0.5rem 0.6rem' }} onClick={() => moveColumn(col.id, -1)} disabled={idx === 0} aria-label="Move up">↑</button>
                <button type="button" className="secondary" style={{ padding: '0.5rem 0.6rem' }} onClick={() => moveColumn(col.id, 1)} disabled={idx === columns.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="danger" onClick={() => removeColumn(col.id)}>Remove</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── CREATE DATABASE ───────────────────────────────── */}
      {mode === 'database' && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <label className="field"><span>Database Name</span><input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="e.g. my_database" /></label>
          <label className="field"><span>Character Set</span><input value={dbCharSet} onChange={(e) => setDbCharSet(e.target.value)} placeholder="e.g. utf8mb4" /></label>
          <label className="field"><span>Collation</span><input value={dbCollation} onChange={(e) => setDbCollation(e.target.value)} placeholder="e.g. utf8mb4_unicode_ci" /></label>
          <label className="checkbox"><input type="checkbox" checked={dbIfNotExists} onChange={(e) => setDbIfNotExists(e.target.checked)} /><span>IF NOT EXISTS</span></label>
          <label className="checkbox"><input type="checkbox" checked={dbIncludeSemicolon} onChange={(e) => setDbIncludeSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
        </div>
      )}

      {/* ── DROP TABLE ────────────────────────────────────── */}
      {mode === 'drop-table' && (
        <div className="row">
          <label className="field"><span>Table Name</span><input value={dropTableName} onChange={(e) => setDropTableName(e.target.value)} placeholder="e.g. old_users" /></label>
          <label className="checkbox"><input type="checkbox" checked={dropTableIfExists} onChange={(e) => setDropTableIfExists(e.target.checked)} /><span>IF EXISTS</span></label>
          <label className="checkbox"><input type="checkbox" checked={dropTableSemicolon} onChange={(e) => setDropTableSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
        </div>
      )}

      {/* ── DROP DATABASE ─────────────────────────────────── */}
      {mode === 'drop-database' && (
        <div className="row">
          <label className="field"><span>Database Name</span><input value={dropDbName} onChange={(e) => setDropDbName(e.target.value)} placeholder="e.g. old_database" /></label>
          <label className="checkbox"><input type="checkbox" checked={dropDbIfExists} onChange={(e) => setDropDbIfExists(e.target.checked)} /><span>IF EXISTS</span></label>
          <label className="checkbox"><input type="checkbox" checked={dropDbSemicolon} onChange={(e) => setDropDbSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
        </div>
      )}

      {/* ── TRUNCATE ─────────────────────────────────────── */}
      {mode === 'truncate' && (
        <div className="row">
          <label className="field"><span>Table Name</span><input value={truncateName} onChange={(e) => setTruncateName(e.target.value)} placeholder="e.g. audit_logs" /></label>
          <label className="checkbox"><input type="checkbox" checked={truncateSemicolon} onChange={(e) => setTruncateSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
        </div>
      )}

      {/* ── Output ───────────────────────────────────────── */}
      <div className="divider" />
      <div className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <SqlHighlighter code={sqlOutput} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="copy" onClick={handleCopy} disabled={!sqlOutput} style={{ flex: 1 }}>Copy SQL</button>
        <button type="button" className="secondary" onClick={handleDownload} disabled={!sqlOutput} style={{ flex: 'none' }}>⬇ Download .sql</button>
      </div>
    </section>
  )
}
