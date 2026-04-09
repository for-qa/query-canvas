import { useMemo, useState, useCallback } from 'react'
import type {
  SqlAlterAction,
  SqlAlterActionType,
  SqlAlterTableQuery,
  SqlColumnType,
  SqlCreateTableColumn,
} from '../domain/sql/SqlModels'
import type { AppUseCases } from '../compositionRoot'
import { usePageTitle } from '../application/usePageTitle'
import { ExportButton } from './components/ExportButton'
import { useQueryHistory } from '../application/useQueryHistory'
import { SqlHighlighter } from './components/SqlHighlighter'

type ActionDraft = {
  id: string
  kind: SqlAlterActionType
  columnName: string
  newName: string
  newTableName: string
  autoIncrement: boolean
  nullable: boolean
  primaryKey: boolean
  unique: boolean
  columnType: SqlColumnType
  columnLength: string
  defaultValue: string
  columns: string
  refTable: string
  refColumns: string
  constraintName: string
  indexName: string
}

const ACTION_TYPES: Array<{ value: SqlAlterActionType; label: string }> = [
  { value: 'ADD_COLUMN', label: 'ADD COLUMN' },
  { value: 'DROP_COLUMN', label: 'DROP COLUMN' },
  { value: 'MODIFY_COLUMN', label: 'MODIFY COLUMN' },
  { value: 'RENAME_COLUMN', label: 'RENAME COLUMN' },
  { value: 'RENAME_TABLE', label: 'RENAME TABLE' },
  { value: 'ADD_PRIMARY_KEY', label: 'ADD PRIMARY KEY' },
  { value: 'DROP_PRIMARY_KEY', label: 'DROP PRIMARY KEY' },
  { value: 'ADD_FOREIGN_KEY', label: 'ADD FOREIGN KEY' },
  { value: 'DROP_FOREIGN_KEY', label: 'DROP FOREIGN KEY' },
  { value: 'ADD_INDEX', label: 'ADD INDEX' },
  { value: 'DROP_INDEX', label: 'DROP INDEX' },
]

const COLUMN_TYPES: SqlColumnType[] = [
  'INT', 'BIGINT', 'SMALLINT', 'DECIMAL', 'FLOAT', 'DOUBLE',
  'VARCHAR', 'TEXT', 'CHAR', 'BOOLEAN', 'DATE', 'DATETIME',
  'TIMESTAMP', 'TIME', 'JSON', 'UUID',
]
const LENGTH_TYPES = new Set(['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE'])

function newActionDraft(): ActionDraft {
  return {
    id: crypto.randomUUID(), kind: 'ADD_COLUMN',
    columnName: '', newName: '', newTableName: '',
    autoIncrement: false, nullable: true, primaryKey: false, unique: false,
    columnType: 'VARCHAR', columnLength: '255', defaultValue: '',
    columns: '', refTable: '', refColumns: '', constraintName: '', indexName: '',
  }
}

function draftToAction(a: ActionDraft): SqlAlterAction | null {
  const colDef: SqlCreateTableColumn = {
    name: a.columnName.trim() || 'col',
    type: a.columnType,
    length: a.columnLength.trim(),
    nullable: a.nullable,
    primaryKey: a.primaryKey,
    unique: a.unique,
    defaultValue: a.defaultValue.trim(),
    autoIncrement: a.autoIncrement,
  }
  const splitCols = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  switch (a.kind) {
    case 'ADD_COLUMN': return { kind: 'ADD_COLUMN', column: colDef }
    case 'DROP_COLUMN': return { kind: 'DROP_COLUMN', columnName: a.columnName }
    case 'MODIFY_COLUMN': return { kind: 'MODIFY_COLUMN', column: colDef }
    case 'RENAME_COLUMN': return { kind: 'RENAME_COLUMN', oldName: a.columnName, newName: a.newName, column: colDef }
    case 'RENAME_TABLE': return { kind: 'RENAME_TABLE', newName: a.newTableName }
    case 'ADD_PRIMARY_KEY': return { kind: 'ADD_PRIMARY_KEY', columns: splitCols(a.columns) }
    case 'DROP_PRIMARY_KEY': return { kind: 'DROP_PRIMARY_KEY' }
    case 'ADD_FOREIGN_KEY': return {
      kind: 'ADD_FOREIGN_KEY',
      columns: splitCols(a.columns),
      refTable: a.refTable,
      refColumns: splitCols(a.refColumns),
      constraintName: a.constraintName || undefined,
    }
    case 'DROP_FOREIGN_KEY': return { kind: 'DROP_FOREIGN_KEY', constraintName: a.constraintName }
    case 'ADD_INDEX': return { kind: 'ADD_INDEX', columns: splitCols(a.columns), unique: a.unique, indexName: a.indexName || undefined }
    case 'DROP_INDEX': return { kind: 'DROP_INDEX', indexName: a.indexName }
    default: return null
  }
}

export function SqlAlterTableApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('ALTER TABLE')
  const { addEntry } = useQueryHistory()
  const [tableName, setTableName] = useState('users')
  const [actions, setActions] = useState<ActionDraft[]>([])
  const [includeSemicolon, setIncludeSemicolon] = useState(true)

  const sqlOutput = useMemo(() => {
    const name = tableName.trim()
    if (!name) return ''
    const mappedActions = actions.map(draftToAction).filter((a): a is SqlAlterAction => a !== null)
    const q: SqlAlterTableQuery = { tableName: name, actions: mappedActions, includeSemicolon }
    return useCases.buildAlterTable.execute(q)
  }, [actions, includeSemicolon, tableName, useCases])

  const addAction = useCallback(() => setActions((p) => [...p, newActionDraft()]), [])
  const removeAction = useCallback((id: string) => setActions((p) => p.filter((a) => a.id !== id)), [])
  const updateAction = useCallback((id: string, patch: Partial<ActionDraft>) =>
    setActions((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a))), [])

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, `ALTER TABLE ${tableName.trim() || '?'}`)
  }, [sqlOutput, addEntry, tableName])

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2>ALTER TABLE Builder</h2>
      <p className="hint">Modify an existing table's schema — add/drop/rename columns, manage keys and indexes.</p>

      <div className="row">
        <label className="field"><span>Target Table</span><input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g. users" /></label>
        <label className="checkbox"><input type="checkbox" checked={includeSemicolon} onChange={(e) => setIncludeSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
      </div>

      <div className="whereHeader">
        <h3>Actions</h3>
        <button type="button" onClick={addAction}>+ Add action</button>
      </div>

      {actions.length === 0 ? (
        <p className="hint">No actions added.</p>
      ) : (
        <div className="conditions" style={{ flexDirection: 'column', gap: '0.6rem' }}>
          {actions.map((act) => (
            <div key={act.id} className="conditionRow" style={{ flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              <label className="field small">
                <span>Action</span>
                <select value={act.kind} onChange={(e) => updateAction(act.id, { kind: e.target.value as SqlAlterActionType })}>
                  {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>

              {(act.kind === 'ADD_COLUMN' || act.kind === 'MODIFY_COLUMN' || act.kind === 'DROP_COLUMN' || act.kind === 'RENAME_COLUMN') && (
                <label className="field small"><span>Column Name</span><input value={act.columnName} onChange={(e) => updateAction(act.id, { columnName: e.target.value })} placeholder="e.g. status" /></label>
              )}
              {act.kind === 'RENAME_COLUMN' && (
                <label className="field small"><span>New Name</span><input value={act.newName} onChange={(e) => updateAction(act.id, { newName: e.target.value })} placeholder="e.g. state" /></label>
              )}
              {act.kind === 'RENAME_TABLE' && (
                <label className="field small"><span>New Table Name</span><input value={act.newTableName} onChange={(e) => updateAction(act.id, { newTableName: e.target.value })} placeholder="e.g. old_users" /></label>
              )}
              {(act.kind === 'ADD_COLUMN' || act.kind === 'MODIFY_COLUMN' || act.kind === 'RENAME_COLUMN') && (
                <>
                  <label className="field small">
                    <span>Type</span>
                    <select value={act.columnType} onChange={(e) => updateAction(act.id, { columnType: e.target.value as SqlColumnType, columnLength: LENGTH_TYPES.has(e.target.value) ? (act.columnLength || '255') : '' })}>
                      {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  {LENGTH_TYPES.has(act.columnType) && (
                    <label className="field small"><span>Length</span><input value={act.columnLength} onChange={(e) => updateAction(act.id, { columnLength: e.target.value })} style={{ width: '5rem' }} /></label>
                  )}
                  <label className="checkbox"><input type="checkbox" checked={!act.nullable} onChange={(e) => updateAction(act.id, { nullable: !e.target.checked })} /><span>NOT NULL</span></label>
                  <label className="field small"><span>Default</span><input value={act.defaultValue} onChange={(e) => updateAction(act.id, { defaultValue: e.target.value })} placeholder="optional" /></label>
                </>
              )}
              {(act.kind === 'ADD_PRIMARY_KEY' || act.kind === 'ADD_FOREIGN_KEY' || act.kind === 'ADD_INDEX') && (
                <label className="field"><span>Columns (comma-separated)</span><input value={act.columns} onChange={(e) => updateAction(act.id, { columns: e.target.value })} placeholder="e.g. id, tenant_id" /></label>
              )}
              {act.kind === 'ADD_FOREIGN_KEY' && (
                <>
                  <label className="field small"><span>Ref Table</span><input value={act.refTable} onChange={(e) => updateAction(act.id, { refTable: e.target.value })} placeholder="e.g. tenants" /></label>
                  <label className="field small"><span>Ref Columns</span><input value={act.refColumns} onChange={(e) => updateAction(act.id, { refColumns: e.target.value })} placeholder="e.g. id" /></label>
                  <label className="field small"><span>Constraint Name</span><input value={act.constraintName} onChange={(e) => updateAction(act.id, { constraintName: e.target.value })} placeholder="optional" /></label>
                </>
              )}
              {act.kind === 'DROP_FOREIGN_KEY' && (
                <label className="field small"><span>Constraint Name</span><input value={act.constraintName} onChange={(e) => updateAction(act.id, { constraintName: e.target.value })} placeholder="e.g. fk_users_tenant" /></label>
              )}
              {(act.kind === 'ADD_INDEX' || act.kind === 'DROP_INDEX') && (
                <label className="field small"><span>Index Name</span><input value={act.indexName} onChange={(e) => updateAction(act.id, { indexName: e.target.value })} placeholder="e.g. idx_email" /></label>
              )}
              {act.kind === 'ADD_INDEX' && (
                <label className="checkbox"><input type="checkbox" checked={act.unique} onChange={(e) => updateAction(act.id, { unique: e.target.checked })} /><span>UNIQUE</span></label>
              )}
              <button type="button" className="danger" onClick={() => removeAction(act.id)} style={{ marginLeft: 'auto' }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="divider" />
      <div className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <SqlHighlighter code={sqlOutput} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="copy" onClick={handleCopy} disabled={!sqlOutput} style={{ flex: 1 }}>Copy SQL</button>
        <ExportButton content={sqlOutput} filenameBase={`alter_${tableName || 'table'}`} disabled={!sqlOutput} label="Download" />
      </div>
    </section>
  )
}
