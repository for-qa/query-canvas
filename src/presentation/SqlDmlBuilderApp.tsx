import { useMemo, useState, useCallback } from 'react'
import type {
  SqlCondition, SqlConditionOperator, SqlConditionConnector,
  SqlOrderDirection, SqlUpdateQuery, SqlDeleteQuery,
} from '../domain/sql/SqlModels'
import type { AppUseCases } from '../compositionRoot'
import { usePageTitle } from '../application/usePageTitle'
import { ExportButton } from './components/ExportButton'
import { useQueryHistory } from '../application/useQueryHistory'
import { SqlHighlighter } from './components/SqlHighlighter'
import { useSavedTemplates } from '../application/useSavedTemplates'

type ConditionDraft = Omit<SqlCondition, 'connector'> & { connector: SqlConditionConnector; id: string }
type SetClauseDraft = { id: string; column: string; value: string }

const SQL_OPS: Array<{ label: string; value: SqlConditionOperator }> = [
  { label: '=', value: '=' }, { label: '!=', value: '!=' },
  { label: '>', value: '>' }, { label: '>=', value: '>=' },
  { label: '<', value: '<' }, { label: '<=', value: '<=' },
  { label: 'LIKE', value: 'LIKE' }, { label: 'NOT LIKE', value: 'NOT LIKE' },
  { label: 'IN', value: 'IN' }, { label: 'NOT IN', value: 'NOT IN' },
  { label: 'IS NULL', value: 'IS NULL' }, { label: 'IS NOT NULL', value: 'IS NOT NULL' },
]

const newCond = (): ConditionDraft => ({ id: crypto.randomUUID(), connector: 'AND', field: '', operator: '=', value: '' })
const newSet = (): SetClauseDraft => ({ id: crypto.randomUUID(), column: '', value: '' })

function buildConditions(drafts: ConditionDraft[]): SqlCondition[] {
  return drafts.map((r) => ({ connector: r.connector, field: r.field.trim(), operator: r.operator, value: r.value }))
}

export function SqlDmlBuilderApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('UPDATE / DELETE Builder')
  const { addEntry } = useQueryHistory()
  const { saveTemplate } = useSavedTemplates()
  const [mode, setMode] = useState<'UPDATE' | 'DELETE'>('UPDATE')
  const [table, setTable] = useState('users')
  const [sqlSets, setSqlSets] = useState<SetClauseDraft[]>([newSet()])
  const [sqlWhere, setSqlWhere] = useState<ConditionDraft[]>([])
  const [orderField, setOrderField] = useState('')
  const [orderDir, setOrderDir] = useState<SqlOrderDirection>('ASC')
  const [sqlLimit, setSqlLimit] = useState('')
  const [quoteIdentifiers, setQuoteIdentifiers] = useState(false)
  const [includeSemicolon, setIncludeSemicolon] = useState(true)

  const addSet = useCallback(() => setSqlSets((p) => [...p, newSet()]), [])
  const removeSet = useCallback((id: string) => setSqlSets((p) => p.filter((s) => s.id !== id)), [])
  const updateSet = useCallback((id: string, patch: Partial<SetClauseDraft>) =>
    setSqlSets((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s))), [])
  const addWhere = useCallback(() => setSqlWhere((p) => [...p, newCond()]), [])
  const removeWhere = useCallback((id: string) => setSqlWhere((p) => p.filter((w) => w.id !== id)), [])
  const updateWhere = useCallback((id: string, patch: Partial<ConditionDraft>) =>
    setSqlWhere((p) => p.map((w) => (w.id === id ? { ...w, ...patch } : w))), [])

  const sqlOutput = useMemo(() => {
    const t = table.trim()
    if (!t) return ''
    const where = buildConditions(sqlWhere)
    const limit = sqlLimit.trim() ? Number.parseInt(sqlLimit, 10) : undefined
    const orderBy = orderField.trim() ? { field: orderField.trim(), direction: orderDir } : undefined

    if (mode === 'UPDATE') {
      const sets = sqlSets.filter((s) => s.column.trim()).map((s) => ({ column: s.column.trim(), value: s.value }))
      if (!sets.length) return ''
      const q: SqlUpdateQuery = { table: t, sets, where, orderBy, limit, quoteIdentifiers, includeSemicolon }
      return useCases.buildDml.executeUpdate(q)
    }
    const q: SqlDeleteQuery = { table: t, where, orderBy, limit, quoteIdentifiers, includeSemicolon }
    return useCases.buildDml.executeDelete(q)
  }, [mode, table, sqlWhere, sqlLimit, orderField, orderDir, sqlSets, quoteIdentifiers, includeSemicolon, useCases])

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, `${mode} on ${table.trim() || '?'}`)
  }, [sqlOutput, addEntry, mode, table])

  const handleSaveTemplate = useCallback(() => {
    if (!sqlOutput) return
    const name = globalThis.prompt('Enter a name for this template:', `${mode} on ${table.trim() || 'users'}`)
    if (name) {
      saveTemplate(name, sqlOutput, 'DML Builder')
      alert('Template saved to library!')
    }
  }, [sqlOutput, table, mode, saveTemplate])

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2>DML Builder — UPDATE / DELETE</h2>
      <p className="hint">Build <code>UPDATE</code> or <code>DELETE</code> statements with WHERE, ORDER BY, and LIMIT.</p>

      <div className="row" style={{ marginBottom: '1rem' }}>
        {(['UPDATE', 'DELETE'] as const).map((m) => (
          <button key={m} type="button"
            className={mode === m ? 'copy' : 'secondary'}
            style={{ display: 'inline-block', width: 'auto', marginTop: 0 }}
            onClick={() => setMode(m)}>{m}</button>
        ))}
      </div>

      <div className="row">
        <label className="field"><span>Table</span><input value={table} onChange={(e) => setTable(e.target.value)} placeholder="e.g. users" /></label>
        <label className="checkbox"><input type="checkbox" checked={quoteIdentifiers} onChange={(e) => setQuoteIdentifiers(e.target.checked)} /><span>Quote Identifiers</span></label>
        <label className="checkbox"><input type="checkbox" checked={includeSemicolon} onChange={(e) => setIncludeSemicolon(e.target.checked)} /><span>Include semicolon</span></label>
      </div>

      {mode === 'UPDATE' && (
        <>
          <div className="whereHeader"><h3>SET</h3><button type="button" onClick={addSet}>+ Add SET</button></div>
          <div className="conditions">
            {sqlSets.map((s) => (
              <div key={s.id} className="conditionRow">
                <label className="field"><span>Column</span><input value={s.column} onChange={(e) => updateSet(s.id, { column: e.target.value })} placeholder="e.g. status" /></label>
                <label className="field"><span>New Value</span><input value={s.value} onChange={(e) => updateSet(s.id, { value: e.target.value })} placeholder="e.g. active" /></label>
                <button type="button" className="danger" onClick={() => removeSet(s.id)} disabled={sqlSets.length <= 1}>Remove</button>
              </div>
            ))}
          </div>
          <div className="divider" />
        </>
      )}

      <div className="whereHeader"><h3>WHERE</h3><button type="button" onClick={addWhere}>+ Add condition</button></div>
      {sqlWhere.length === 0
        ? <p className="hint">⚠️ No conditions — this will affect ALL rows!</p>
        : (
          <div className="conditions">
            {sqlWhere.map((row, idx) => {
              const noVal = row.operator === 'IS NULL' || row.operator === 'IS NOT NULL'
              return (
                <div className="conditionRow" key={row.id}>
                  {idx > 0 && (
                    <label className="field small"><span>Connector</span>
                      <select value={row.connector} onChange={(e) => updateWhere(row.id, { connector: e.target.value as SqlConditionConnector })}>
                        <option value="AND">AND</option><option value="OR">OR</option>
                      </select>
                    </label>
                  )}
                  <label className="field small"><span>Field</span><input value={row.field} onChange={(e) => updateWhere(row.id, { field: e.target.value })} placeholder="field" /></label>
                  <label className="field small"><span>Operator</span>
                    <select value={row.operator} onChange={(e) => {
                      const op = e.target.value as SqlConditionOperator
                      updateWhere(row.id, { operator: op, value: (op === 'IS NULL' || op === 'IS NOT NULL') ? '' : row.value })
                    }}>
                      {SQL_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Value</span><input value={row.value ?? ''} onChange={(e) => updateWhere(row.id, { value: e.target.value })} placeholder="value" disabled={noVal} /></label>
                  <button type="button" className="danger" onClick={() => removeWhere(row.id)}>Remove</button>
                </div>
              )
            })}
          </div>
        )
      }

      <div className="divider" />
      <div className="row">
        <label className="field"><span>ORDER BY field</span><input value={orderField} onChange={(e) => setOrderField(e.target.value)} placeholder="e.g. id (optional)" /></label>
        <label className="field small"><span>Direction</span>
          <select value={orderDir} onChange={(e) => setOrderDir(e.target.value as SqlOrderDirection)}>
            <option value="ASC">ASC</option><option value="DESC">DESC</option>
          </select>
        </label>
        <label className="field small"><span>LIMIT</span><input value={sqlLimit} onChange={(e) => setSqlLimit(e.target.value)} placeholder="optional" /></label>
      </div>

      <div className="divider" />
      <div className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <SqlHighlighter code={sqlOutput} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="copy" onClick={handleCopy} disabled={!sqlOutput} style={{ flex: 1 }}>Copy SQL</button>
        <button type="button" className="secondary" onClick={handleSaveTemplate} disabled={!sqlOutput} style={{ flex: 1 }}>📁 Save Template</button>
        <ExportButton content={sqlOutput} filenameBase={`dml_${mode.toLowerCase()}_${table || 'table'}`} disabled={!sqlOutput} label="Download" style={{ flex: 1 }} />
      </div>
    </section>
  )
}
