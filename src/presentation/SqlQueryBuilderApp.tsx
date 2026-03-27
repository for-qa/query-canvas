import { useMemo, useState, useCallback, useEffect } from 'react'
import type {
  SqlCondition,
  SqlConditionOperator,
  SqlJoin,
  SqlJoinType,
  SqlOrderBy,
  SqlOrderDirection,
  SqlQuery,
} from '../domain/sql/SqlModels'
import type { AppUseCases } from '../compositionRoot'
import { useQueryHistory } from '../application/useQueryHistory'
import { usePageTitle } from '../application/usePageTitle'
import { downloadSql } from '../application/downloadSql'
import { SqlHighlighter } from './components/SqlHighlighter'
import { encodeState, decodeState } from '../application/urlStateUtils'

interface ShareState {
  table: string
  columns: string
  distinct: boolean
  joins: JoinDraft[]
  where: ConditionDraft[]
  having: ConditionDraft[]
  groupBy: string
  limit: string
  offset: string
  quoteIdentifiers: boolean
  semicolon: boolean
}

type ConditionDraft = Omit<SqlCondition, 'connector'> & { connector: 'AND' | 'OR'; id: string }
type JoinDraft = SqlJoin & { id: string }
type OrderByDraft = SqlOrderBy & { id: string }

const SQL_OPERATORS: Array<{ label: string; value: SqlConditionOperator }> = [
  { label: '=', value: '=' }, { label: '!=', value: '!=' },
  { label: '>', value: '>' }, { label: '>=', value: '>=' },
  { label: '<', value: '<' }, { label: '<=', value: '<=' },
  { label: 'LIKE', value: 'LIKE' }, { label: 'NOT LIKE', value: 'NOT LIKE' },
  { label: 'ILIKE', value: 'ILIKE' }, { label: 'NOT ILIKE', value: 'NOT ILIKE' },
  { label: 'IN', value: 'IN' }, { label: 'NOT IN', value: 'NOT IN' },
  { label: 'IS NULL', value: 'IS NULL' }, { label: 'IS NOT NULL', value: 'IS NOT NULL' },
]

const JOIN_TYPES: Array<{ label: string; value: SqlJoinType }> = [
  { label: 'INNER JOIN', value: 'INNER JOIN' }, { label: 'LEFT JOIN', value: 'LEFT JOIN' },
  { label: 'RIGHT JOIN', value: 'RIGHT JOIN' }, { label: 'FULL OUTER JOIN', value: 'FULL OUTER JOIN' },
  { label: 'CROSS JOIN', value: 'CROSS JOIN' },
]

function newCondition(): ConditionDraft {
  return { id: crypto.randomUUID(), connector: 'AND', field: '', operator: '=', value: '' }
}
function newJoin(): JoinDraft {
  return { id: crypto.randomUUID(), type: 'INNER JOIN', table: '', on: '' }
}
function newOrder(): OrderByDraft {
  return { id: crypto.randomUUID(), field: '', direction: 'ASC' }
}

function ConditionsSection({
  title,
  testIdPrefix,
  conditions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string
  testIdPrefix: string
  conditions: ConditionDraft[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<ConditionDraft>) => void
  onRemove: (id: string) => void
}) {
  return (
    <>
      <div className="whereHeader">
        <h3>{title}</h3>
        <button type="button" data-testid={`${testIdPrefix}-add`} onClick={onAdd}>+ Add</button>
      </div>
      {conditions.length === 0 ? (
        <p className="hint">No {title.toLowerCase()} conditions yet.</p>
      ) : (
        <div className="conditions">
          {conditions.map((row, idx) => {
            const valueDisabled = row.operator === 'IS NULL' || row.operator === 'IS NOT NULL'
            let placeholder = 'e.g. 18'
            if (row.operator === 'IN' || row.operator === 'NOT IN') placeholder = 'e.g. 1,2,3'
            else if (row.operator.includes('LIKE')) placeholder = 'e.g. %test%'
            return (
              <div className="conditionRow" key={row.id}>
                {idx > 0 && (
                  <label className="field small">
                    <span>Connector</span>
                    <select value={row.connector}
                      onChange={(e) => onUpdate(row.id, { connector: e.target.value as 'AND' | 'OR' })}>
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </label>
                )}
                <label className="field small">
                  <span>Field</span>
                  <input data-testid={`${testIdPrefix}-field-${idx}`} value={row.field}
                    onChange={(e) => onUpdate(row.id, { field: e.target.value })} placeholder="e.g. age" />
                </label>
                <label className="field small">
                  <span>Operator</span>
                  <select data-testid={`${testIdPrefix}-op-${idx}`} value={row.operator}
                    onChange={(e) => {
                      const op = e.target.value as SqlConditionOperator
                      onUpdate(row.id, { operator: op, value: op === 'IS NULL' || op === 'IS NOT NULL' ? '' : row.value })
                    }}>
                    {SQL_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Value</span>
                  <input data-testid={`${testIdPrefix}-val-${idx}`} value={row.value ?? ''}
                    onChange={(e) => onUpdate(row.id, { value: e.target.value })}
                    placeholder={placeholder} disabled={valueDisabled} />
                </label>
                <button type="button" className="danger"
                  onClick={() => onRemove(row.id)} aria-label={`Remove ${title} ${idx + 1}`}>Remove</button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export function SqlQueryBuilderApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('SQL Builder')
  const [sqlTable, setSqlTable] = useState('users')
  const [sqlColumns, setSqlColumns] = useState('id, name')
  const [sqlDistinct, setSqlDistinct] = useState(false)
  const [sqlJoins, setSqlJoins] = useState<JoinDraft[]>([])
  const [sqlWhere, setSqlWhere] = useState<ConditionDraft[]>([])
  const [sqlGroupBy, setSqlGroupBy] = useState('')
  const [sqlHaving, setSqlHaving] = useState<ConditionDraft[]>([])
  const [sqlOrderBys, setSqlOrderBys] = useState<OrderByDraft[]>([{ id: crypto.randomUUID(), field: '', direction: 'ASC' }])
  const [sqlLimit, setSqlLimit] = useState('')
  const [sqlOffset, setSqlOffset] = useState('')
  const [sqlQuoteIdentifiers, setSqlQuoteIdentifiers] = useState(false)
  const [sqlIncludeSemicolon, setSqlIncludeSemicolon] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const { history, addEntry, removeEntry, clearHistory } = useQueryHistory()

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)
    const q = params.get('q')
    if (q) {
      const state = decodeState<ShareState>(q)
      if (state) {
        if (state.table) setSqlTable(state.table)
        if (state.columns) setSqlColumns(state.columns)
        if (state.distinct !== undefined) setSqlDistinct(state.distinct)
        if (state.joins) setSqlJoins(state.joins.map(j => ({ ...j, id: crypto.randomUUID() })))
        if (state.where) setSqlWhere(state.where.map(w => ({ ...w, id: crypto.randomUUID() })))
        if (state.having) setSqlHaving(state.having.map(h => ({ ...h, id: crypto.randomUUID() })))
        if (state.groupBy) setSqlGroupBy(state.groupBy)
        if (state.limit) setSqlLimit(state.limit)
        if (state.offset) setSqlOffset(state.offset)
        if (state.quoteIdentifiers !== undefined) setSqlQuoteIdentifiers(state.quoteIdentifiers)
        if (state.semicolon !== undefined) setSqlIncludeSemicolon(state.semicolon)
      }
    }
  }, [])

  const sqlOutput = useMemo(() => {
    const table = sqlTable.trim()
    if (!table) return ''

    const columns = sqlColumns.split(',').map((c) => c.trim()).filter(Boolean)
    const groupBy = sqlGroupBy.split(',').map((x) => x.trim()).filter(Boolean)
    const limitParsed = sqlLimit.trim() ? Number.parseInt(sqlLimit, 10) : undefined
    const offsetParsed = sqlOffset.trim() ? Number.parseInt(sqlOffset, 10) : undefined

    const joins: SqlJoin[] = sqlJoins.filter((j) => j.table.trim()).map(({ type, table: t, on }) => ({ type, table: t, on }))
    const where: SqlCondition[] = sqlWhere.map((r) => ({ connector: r.connector, field: r.field.trim(), operator: r.operator, value: r.value }))
    const having: SqlCondition[] = sqlHaving.map((r) => ({ connector: r.connector, field: r.field.trim(), operator: r.operator, value: r.value }))
    const orderBy: SqlOrderBy[] = sqlOrderBys.filter((o) => o.field.trim()).map(({ field, direction }) => ({ field: field.trim(), direction }))

    const query: SqlQuery = {
      table, columns, distinct: sqlDistinct, joins, where, having, groupBy, orderBy,
      limit: typeof limitParsed === 'number' && Number.isFinite(limitParsed) ? limitParsed : undefined,
      offset: typeof offsetParsed === 'number' && Number.isFinite(offsetParsed) ? offsetParsed : undefined,
      quoteIdentifiers: sqlQuoteIdentifiers,
      includeSemicolon: sqlIncludeSemicolon,
    }

    return useCases.buildSqlQuery.execute(query)
  }, [sqlColumns, sqlDistinct, sqlGroupBy, sqlHaving, sqlIncludeSemicolon, sqlJoins, sqlLimit, sqlOffset,
      sqlOrderBys, sqlQuoteIdentifiers, sqlTable, sqlWhere, useCases])

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, `SELECT from ${sqlTable.trim() || '?'}`)
  }, [sqlOutput, addEntry, sqlTable])

  // ── WHERE helpers
  const addWhere = useCallback(() => setSqlWhere((p) => [...p, newCondition()]), [])
  const updateWhere = useCallback((id: string, patch: Partial<ConditionDraft>) =>
    setSqlWhere((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)), [])
  const removeWhere = useCallback((id: string) => setSqlWhere((p) => p.filter((r) => r.id !== id)), [])

  // ── HAVING helpers
  const addHaving = useCallback(() => setSqlHaving((p) => [...p, newCondition()]), [])
  const updateHaving = useCallback((id: string, patch: Partial<ConditionDraft>) =>
    setSqlHaving((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)), [])
  const removeHaving = useCallback((id: string) => setSqlHaving((p) => p.filter((r) => r.id !== id)), [])

  // ── JOIN helpers
  const addJoin = useCallback(() => setSqlJoins((p) => [...p, newJoin()]), [])
  const updateJoin = useCallback((id: string, patch: Partial<JoinDraft>) =>
    setSqlJoins((p) => p.map((j) => j.id === id ? { ...j, ...patch } : j)), [])
  const removeJoin = useCallback((id: string) => setSqlJoins((p) => p.filter((j) => j.id !== id)), [])

  // ── ORDER BY helpers
  const addOrder = useCallback(() => setSqlOrderBys((p) => [...p, newOrder()]), [])
  const updateOrder = useCallback((id: string, patch: Partial<OrderByDraft>) =>
    setSqlOrderBys((p) => p.map((o) => o.id === id ? { ...o, ...patch } : o)), [])
  const removeOrder = useCallback((id: string) => setSqlOrderBys((p) => p.filter((o) => o.id !== id)), [])

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>SQL Query Builder</h2>
        <button type="button" className="secondary" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide History' : `History (${history.length})`}
        </button>
      </div>

      {/* ── History Panel ─────────────────────────────────── */}
      {showHistory && (
        <div className="historyPanel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong>Query History (last {history.length})</strong>
            {history.length > 0 && <button type="button" className="danger" onClick={clearHistory}>Clear all</button>}
          </div>
          {history.length === 0 ? (
            <p className="hint">No saved queries yet. Click "Save to History" after building a query.</p>
          ) : (
            <div className="historyList">
              {history.map((entry) => (
                <div key={entry.id} className="historyEntry">
                  <div className="historyMeta">
                    <span className="historyLabel">{entry.label}</span>
                    <span className="historyTime">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className="historySql">{entry.sql}</pre>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="copy" onClick={() => navigator.clipboard.writeText(entry.sql)}>Copy</button>
                    <button type="button" className="danger" onClick={() => removeEntry(entry.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FROM ─────────────────────────────────────────── */}
      <div className="row">
        <label className="field">
          <span>Table</span>
          <input data-testid="sql-table-input" value={sqlTable}
            onChange={(e) => setSqlTable(e.target.value)} placeholder="e.g. users" />
        </label>
        <label className="field">
          <span>Columns</span>
          <input data-testid="sql-columns-input" value={sqlColumns}
            onChange={(e) => setSqlColumns(e.target.value)} placeholder="e.g. id, name, COUNT(*) AS total" />
        </label>
        <label className="checkbox" title="SELECT DISTINCT">
          <input type="checkbox" checked={sqlDistinct}
            onChange={(e) => setSqlDistinct(e.target.checked)} />
          <span>DISTINCT</span>
        </label>
      </div>

      {/* ── JOIN ─────────────────────────────────────────── */}
      <div className="whereHeader">
        <h3>JOIN</h3>
        <button type="button" data-testid="sql-add-join" onClick={addJoin}>+ Add JOIN</button>
      </div>
      {sqlJoins.length === 0 ? (
        <p className="hint">No joins added.</p>
      ) : (
        <div className="conditions">
          {sqlJoins.map((join) => (
            <div className="conditionRow" key={join.id}>
              <label className="field small">
                <span>Type</span>
                <select value={join.type} onChange={(e) => updateJoin(join.id, { type: e.target.value as SqlJoinType })}>
                  {JOIN_TYPES.map((jt) => <option key={jt.value} value={jt.value}>{jt.label}</option>)}
                </select>
              </label>
              <label className="field small">
                <span>Table</span>
                <input value={join.table} onChange={(e) => updateJoin(join.id, { table: e.target.value })} placeholder="e.g. orders" />
              </label>
              <label className="field">
                <span>ON condition</span>
                <input value={join.on} onChange={(e) => updateJoin(join.id, { on: e.target.value })}
                  placeholder="e.g. users.id = orders.user_id" />
              </label>
              <button type="button" className="danger" onClick={() => removeJoin(join.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* ── WHERE ────────────────────────────────────────── */}
      <ConditionsSection title="WHERE" testIdPrefix="sql-condition"
        conditions={sqlWhere} onAdd={addWhere} onUpdate={updateWhere} onRemove={removeWhere} />

      <div className="divider" />

      {/* ── GROUP BY + HAVING ─────────────────────────────── */}
      <div className="row">
        <label className="field">
          <span>GROUP BY (comma-separated)</span>
          <input value={sqlGroupBy} onChange={(e) => setSqlGroupBy(e.target.value)} placeholder="e.g. status, department" />
        </label>
      </div>

      <ConditionsSection title="HAVING" testIdPrefix="sql-having"
        conditions={sqlHaving} onAdd={addHaving} onUpdate={updateHaving} onRemove={removeHaving} />

      <div className="divider" />

      {/* ── ORDER BY ─────────────────────────────────────── */}
      <div className="whereHeader">
        <h3>ORDER BY</h3>
        <button type="button" onClick={addOrder}>+ Add sort</button>
      </div>
      {sqlOrderBys.length === 0 ? (
        <p className="hint">No sort columns.</p>
      ) : (
        <div className="conditions">
          {sqlOrderBys.map((o, idx) => (
            <div className="conditionRow" key={o.id}>
              <label className="field">
                <span>Field</span>
                <input value={o.field} onChange={(e) => updateOrder(o.id, { field: e.target.value })}
                  placeholder="e.g. created_at" />
              </label>
              <label className="field small">
                <span>Direction</span>
                <select value={o.direction} onChange={(e) => updateOrder(o.id, { direction: e.target.value as SqlOrderDirection })}>
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </label>
              <button type="button" className="danger" onClick={() => removeOrder(o.id)}
                disabled={sqlOrderBys.length <= 1 && idx === 0}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* ── LIMIT / OFFSET / Options ─────────────────────── */}
      <div className="row" style={{ marginTop: '0.75rem' }}>
        <label className="field small">
          <span>LIMIT</span>
          <input value={sqlLimit} onChange={(e) => setSqlLimit(e.target.value)} placeholder="optional" />
        </label>
        <label className="field small">
          <span>OFFSET</span>
          <input value={sqlOffset} onChange={(e) => setSqlOffset(e.target.value)} placeholder="optional" />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={sqlQuoteIdentifiers}
            onChange={(e) => setSqlQuoteIdentifiers(e.target.checked)} />
          <span>Quote identifiers</span>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={sqlIncludeSemicolon}
            onChange={(e) => setSqlIncludeSemicolon(e.target.checked)}
            data-testid="sql-include-semicolon" />
          <span>Include semicolon</span>
        </label>
      </div>

      {/* ── Output ───────────────────────────────────────── */}
      <div className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <SqlHighlighter code={sqlOutput} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="copy"
          onClick={handleCopy} disabled={!sqlOutput} style={{ flex: 1 }}>
          Copy SQL
        </button>
        <button type="button" className="secondary"
          onClick={() => {
            const state = {
              table: sqlTable, columns: sqlColumns, distinct: sqlDistinct,
              joins: sqlJoins, where: sqlWhere, having: sqlHaving,
              groupBy: sqlGroupBy, limit: sqlLimit, offset: sqlOffset,
              quoteIdentifiers: sqlQuoteIdentifiers, semicolon: sqlIncludeSemicolon
            }
            const encoded = encodeState(state)
            const url = new URL(globalThis.location.href)
            url.searchParams.set('q', encoded)
            void navigator.clipboard.writeText(url.toString())
            alert('Shareable link copied to clipboard!')
          }} disabled={!sqlOutput}>
          🔗 Share Link
        </button>
        <button type="button" className="secondary"
          onClick={() => downloadSql(sqlOutput, `select_${sqlTable || 'query'}`)} disabled={!sqlOutput}>
          ⬇ Download .sql
        </button>
      </div>
    </section>
  )
}
