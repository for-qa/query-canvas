import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
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
import { useSavedTemplates } from '../application/useSavedTemplates'
import type { AiGeneratedQuery } from '../application/geminiService'
import { generateSqlFromPrompt } from '../application/geminiService'
import { useAiSettings } from '../application/useAiSettings'
import { useSqlValidation } from '../application/useSqlValidation'
import { useKeyboardShortcuts } from '../application/useKeyboardShortcuts'

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

interface QueryHistoryEntry {
  readonly id: string
  readonly sql: string
  readonly label: string
  readonly timestamp: number
}

function ConditionsSection({
  title,
  testIdPrefix,
  conditions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  readonly title: string
  readonly testIdPrefix: string
  readonly conditions: readonly ConditionDraft[]
  readonly onAdd: () => void
  readonly onUpdate: (id: string, patch: Partial<ConditionDraft>) => void
  readonly onRemove: (id: string) => void
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

function AiAssistant({ prompt, setPrompt, onGenerate, isGenerating, promptRef, hasApiKey, error, onClearError }: {
  readonly prompt: string
  readonly setPrompt: (v: string) => void
  readonly onGenerate: () => void
  readonly isGenerating: boolean
  readonly promptRef?: React.RefObject<HTMLInputElement | null>
  readonly hasApiKey?: boolean
  readonly error?: string | null
  readonly onClearError?: () => void
}) {
  return (
    <div className="aiAssistant" style={{ 
      marginBottom: '1.5rem', 
      padding: '1rem', 
      background: 'linear-gradient(135deg, rgba(124, 77, 255, 0.1), rgba(0, 188, 212, 0.1))',
      borderRadius: '12px',
      border: '1px solid rgba(124, 77, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <div style={{ flex: 1 }}>
          <input 
            ref={promptRef}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); if (error && onClearError) onClearError(); }}
            placeholder={hasApiKey ? "Ask AI: 'Get users who joined last month'..." : "Mock Mode: 'Get users', 'Get products', 'Get orders'..."}
            style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--panel-border)', padding: '0.6rem 1rem', borderRadius: '8px' }}
            onKeyDown={(e) => { 
                if (e.key === 'Enter') onGenerate()
            }}
          />
        </div>
        <button 
          type="button" 
          className="copy" 
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          style={{ width: 'auto', marginTop: 0, padding: '0.6rem 1.2rem' }}
        >
          {isGenerating ? 'Generating...' : 'Generate SQL'}
        </button>
      </div>
      {error && (
         <div style={{ color: '#fca5a5', fontSize: '0.85rem', paddingLeft: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> {error}
         </div>
      )}
    </div>
  )
}

function HistoryPanel({ history, clearHistory, removeEntry }: {
  readonly history: readonly QueryHistoryEntry[]
  readonly clearHistory: () => void
  readonly removeEntry: (id: string) => void
}) {
  return (
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
                <button type="button" className="copy" onClick={() => navigator.clipboard.writeText(entry.sql)}>Copy </button>
                <button type="button" className="danger" onClick={() => removeEntry(entry.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function useSqlBuilderPersistence(s: ReturnType<typeof useBuilderState>) {
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)
    const q = params.get('q')
    if (!q) return
    const state = decodeState<ShareState>(q)
    if (!state) return

    if (state.table) s.setSqlTable(state.table)
    if (state.columns) s.setSqlColumns(state.columns)
    if (state.distinct !== undefined) s.setSqlDistinct(state.distinct)
    if (state.joins) s.setSqlJoins(state.joins.map(j => ({ ...j, id: crypto.randomUUID() })))
    if (state.where) s.setSqlWhere(state.where.map(w => ({ ...w, id: crypto.randomUUID() })))
    if (state.having) s.setSqlHaving(state.having.map(h => ({ ...h, id: crypto.randomUUID() })))
    if (state.groupBy) s.setSqlGroupBy(state.groupBy)
    if (state.limit) s.setSqlLimit(state.limit)
    if (state.offset) s.setSqlOffset(state.offset)
    if (state.quoteIdentifiers !== undefined) s.setSqlQuoteIdentifiers(state.quoteIdentifiers)
    if (state.semicolon !== undefined) s.setSqlIncludeSemicolon(state.semicolon)
  }, [s])
}

function useSqlGenerator(s: ReturnType<typeof useBuilderState>, useCases: AppUseCases) {
  return useMemo(() => {
    const table = s.sqlTable.trim()
    if (!table) return ''

    const columns = s.sqlColumns.split(',').map((c) => c.trim()).filter(Boolean)
    const groupBy = s.sqlGroupBy.split(',').map((x) => x.trim()).filter(Boolean)
    const limitParsed = s.sqlLimit.trim() ? Number.parseInt(s.sqlLimit, 10) : undefined
    const offsetParsed = s.sqlOffset.trim() ? Number.parseInt(s.sqlOffset, 10) : undefined

    const joins: SqlJoin[] = s.sqlJoins.filter((j) => j.table.trim()).map(({ type, table: t, on }) => ({ type, table: t, on }))
    const where: SqlCondition[] = s.sqlWhere.map((r) => ({ connector: r.connector, field: r.field.trim(), operator: r.operator, value: r.value }))
    const having: SqlCondition[] = s.sqlHaving.map((r) => ({ connector: r.connector, field: r.field.trim(), operator: r.operator, value: r.value }))
    const orderBy: SqlOrderBy[] = s.sqlOrderBys.filter((o) => o.field.trim()).map(({ field, direction }) => ({ field: field.trim(), direction }))

    const query: SqlQuery = {
      table, columns, distinct: s.sqlDistinct, joins, where, having, groupBy, orderBy,
      limit: typeof limitParsed === 'number' && Number.isFinite(limitParsed) ? limitParsed : undefined,
      offset: typeof offsetParsed === 'number' && Number.isFinite(offsetParsed) ? offsetParsed : undefined,
      quoteIdentifiers: s.sqlQuoteIdentifiers,
      includeSemicolon: s.sqlIncludeSemicolon,
    }

    return useCases.buildSqlQuery.execute(query)
  }, [s.sqlColumns, s.sqlDistinct, s.sqlGroupBy, s.sqlHaving, s.sqlIncludeSemicolon, s.sqlJoins, s.sqlLimit, s.sqlOffset,
    s.sqlOrderBys, s.sqlQuoteIdentifiers, s.sqlTable, s.sqlWhere, useCases])
}

function applyAiResult(result: AiGeneratedQuery, s: ReturnType<typeof useBuilderState>) {
  if (result.table) s.setSqlTable(result.table)
  if (result.columns) s.setSqlColumns(result.columns)
  if (result.distinct !== undefined) s.setSqlDistinct(result.distinct)
  if (result.groupBy) s.setSqlGroupBy(result.groupBy)
  if (result.limit) s.setSqlLimit(result.limit)

  if (result.joins?.length) {
    s.setSqlJoins(result.joins.map(j => ({
      id: crypto.randomUUID(), type: (j.type as SqlJoinType) ?? 'INNER JOIN', table: j.table, on: j.on,
    })))
  }
  if (result.where?.length) {
    s.setSqlWhere(result.where.map(c => ({
      id: crypto.randomUUID(), connector: c.connector ?? 'AND', field: c.field, operator: (c.operator as SqlConditionOperator) ?? '=', value: c.value ?? '',
    })))
  }
  if (result.having?.length) {
    s.setSqlHaving(result.having.map(c => ({
      id: crypto.randomUUID(), connector: c.connector ?? 'AND', field: c.field, operator: (c.operator as SqlConditionOperator) ?? '=', value: c.value ?? '',
    })))
  }
  if (result.orderBy?.length) {
    s.setSqlOrderBys(result.orderBy.map(o => ({
      id: crypto.randomUUID(), field: o.field, direction: o.direction ?? 'ASC',
    })))
  }
}

function applyMockAi(prompt: string, s: ReturnType<typeof useBuilderState>, setAiError: (e: string) => void) {
  const p = prompt.toLowerCase()
  if (p.includes('user') && (p.includes('join') || p.includes('sign'))) {
    s.setSqlTable('users'); s.setSqlColumns('id, name, created_at')
    s.setSqlWhere([{ id: crypto.randomUUID(), connector: 'AND', field: 'created_at', operator: '>=', value: "DATE_SUB(NOW(), INTERVAL 1 MONTH)" }])
  } else if (p.includes('product') || p.includes('sale')) {
    s.setSqlTable('products'); s.setSqlColumns('name, price, SUM(sales) as total_sales')
    s.setSqlGroupBy('name, price')
    s.setSqlOrderBys([{ id: crypto.randomUUID(), field: 'total_sales', direction: 'DESC' }])
    s.setSqlLimit('10')
  } else if (p.includes('order') || p.includes('status')) {
    s.setSqlTable('orders'); s.setSqlColumns('*')
    s.setSqlWhere([{ id: crypto.randomUUID(), connector: 'AND', field: 'status', operator: '=', value: "'completed'" }])
  } else {
    setAiError('No API key configured. Add your Gemini key in ⚙️ Settings for real AI. Mock mode only understands: users, products, orders.')
  }
}

function useAiCapability(s: ReturnType<typeof useBuilderState>, apiKey: string) {
  const [aiError, setAiError] = useState<string | null>(null)

  const handleAiGenerate = useCallback(async () => {
    if (!s.aiPrompt.trim()) return
    s.setIsAiGenerating(true)
    setAiError(null)

    try {
      if (apiKey) {
        // ── Real Gemini AI ──────────────────────────────────────
        const result = await generateSqlFromPrompt(s.aiPrompt, apiKey)
        applyAiResult(result, s)
      } else {
        // ── Mock fallback (no API key) ───────────────────────────
        await new Promise(r => setTimeout(r, 600))
        applyMockAi(s.aiPrompt, s, setAiError)
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      s.setIsAiGenerating(false)
      s.setAiPrompt('')
    }
  }, [s, apiKey])

  return { handleAiGenerate, aiError, clearAiError: () => setAiError(null) }
}

function useBuilderActions(
  sqlOutput: string,
  sqlTable: string,
  addEntry: (sql: string, label: string) => void,
  saveTemplate: (name: string, sql: string, group: string) => void,
  setIsRunning: (v: boolean) => void,
  setResults: (v: { columns: string[], rows: Record<string, string>[] } | null) => void,
  sqlColumns: string
) {
  const handleRun = useCallback(async () => {
    if (!sqlOutput) return
    setIsRunning(true)
    setResults(null)
    await new Promise(r => setTimeout(r, 1200))
    const cols = sqlColumns.split(',').map(c => c.trim()).filter(Boolean)
    const mockRows = Array.from({ length: 5 }).map((_, i) => {
      const row: Record<string, string> = { __id: crypto.randomUUID() }
      cols.forEach(c => row[c] = `Value ${i + 1} for ${c}`)
      return row
    })
    setResults({ columns: cols, rows: mockRows })
    setIsRunning(false)
  }, [sqlOutput, sqlColumns, setIsRunning, setResults])

  const handleCopy = useCallback(() => {
    if (!sqlOutput) return
    void navigator.clipboard.writeText(sqlOutput)
    addEntry(sqlOutput, `SELECT from ${sqlTable.trim() || '?'}`)
  }, [sqlOutput, addEntry, sqlTable])

  const handleSaveTemplate = useCallback(() => {
    if (!sqlOutput) return
    const name = globalThis.prompt('Enter a name for this template:', `SELECT from ${sqlTable.trim() || 'users'}`)
    if (name) {
      saveTemplate(name, sqlOutput, 'SQL Builder')
      alert('Template saved to library!')
    }
  }, [sqlOutput, sqlTable, saveTemplate])

  return { handleRun, handleCopy, handleSaveTemplate }
}

function useBuilderHandlers(s: ReturnType<typeof useBuilderState>) {
  const addWhere = useCallback(() => s.setSqlWhere((p) => [...p, newCondition()]), [s])
  const updateWhere = useCallback((id: string, patch: Partial<ConditionDraft>) =>
    s.setSqlWhere((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)), [s])
  const removeWhere = useCallback((id: string) => s.setSqlWhere((p) => p.filter((r) => r.id !== id)), [s])

  const addHaving = useCallback(() => s.setSqlHaving((p) => [...p, newCondition()]), [s])
  const updateHaving = useCallback((id: string, patch: Partial<ConditionDraft>) =>
    s.setSqlHaving((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)), [s])
  const removeHaving = useCallback((id: string) => s.setSqlHaving((p) => p.filter((r) => r.id !== id)), [s])

  const addJoin = useCallback(() => s.setSqlJoins((p) => [...p, newJoin()]), [s])
  const updateJoin = useCallback((id: string, patch: Partial<JoinDraft>) =>
    s.setSqlJoins((p) => p.map((j) => j.id === id ? { ...j, ...patch } : j)), [s])
  const removeJoin = useCallback((id: string) => s.setSqlJoins((p) => p.filter((j) => j.id !== id)), [s])

  const addOrder = useCallback(() => s.setSqlOrderBys((p) => [...p, newOrder()]), [s])
  const updateOrder = useCallback((id: string, patch: Partial<OrderByDraft>) =>
    s.setSqlOrderBys((p) => p.map((o) => o.id === id ? { ...o, ...patch } : o)), [s])
  const removeOrder = useCallback((id: string) => s.setSqlOrderBys((p) => p.filter((o) => o.id !== id)), [s])

  return {
    addWhere, updateWhere, removeWhere,
    addHaving, updateHaving, removeHaving,
    addJoin, updateJoin, removeJoin,
    addOrder, updateOrder, removeOrder
  }
}

function useBuilderState() {
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
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<{ columns: string[], rows: Record<string, string>[] } | null>(null)

  return {
    sqlTable, setSqlTable, sqlColumns, setSqlColumns, sqlDistinct, setSqlDistinct,
    sqlJoins, setSqlJoins, sqlWhere, setSqlWhere, sqlGroupBy, setSqlGroupBy,
    sqlHaving, setSqlHaving, sqlOrderBys, setSqlOrderBys, sqlLimit, setSqlLimit,
    sqlOffset, setSqlOffset, sqlQuoteIdentifiers, setSqlQuoteIdentifiers,
    sqlIncludeSemicolon, setSqlIncludeSemicolon, showHistory, setShowHistory,
    aiPrompt, setAiPrompt, isAiGenerating, setIsAiGenerating,
    isRunning, setIsRunning, results, setResults
  }
}

export function SqlQueryBuilderApp({ useCases }: { readonly useCases: AppUseCases }) {
  usePageTitle('SQL Builder')
  const s = useBuilderState()
  const {
    sqlTable, sqlColumns, sqlDistinct,
    sqlJoins, sqlWhere, sqlGroupBy,
    sqlHaving, sqlOrderBys, sqlLimit,
    sqlOffset, sqlQuoteIdentifiers,
    sqlIncludeSemicolon, showHistory, setShowHistory,
    aiPrompt, setAiPrompt, isAiGenerating,
    isRunning, setIsRunning, results, setResults
  } = s

  const { history, addEntry, removeEntry, clearHistory } = useQueryHistory()
  const { saveTemplate } = useSavedTemplates()
  const { apiKey } = useAiSettings()
  const aiPromptRef = useRef<HTMLInputElement>(null)

  useSqlBuilderPersistence(s)

  const sqlOutput = useSqlGenerator(s, useCases)
  const { handleAiGenerate, aiError, clearAiError } = useAiCapability(s, apiKey)
  const { handleRun, handleCopy, handleSaveTemplate } = useBuilderActions(
    sqlOutput, sqlTable, addEntry, saveTemplate, setIsRunning, setResults, sqlColumns
  )
  const h = useBuilderHandlers(s)
  const warnings = useSqlValidation(s)

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useKeyboardShortcuts({
    'ctrl+enter': handleCopy,
    'ctrl+shift+d': () => downloadSql(sqlOutput, `select_${sqlTable || 'query'}`),
    'ctrl+k': () => aiPromptRef.current?.focus(),
  })

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>SQL Query Builder</h2>
        <button type="button" className="secondary" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide History' : `History (${history.length})`}
        </button>
      </div>

      <AiAssistant
        prompt={aiPrompt}
        setPrompt={setAiPrompt}
        onGenerate={handleAiGenerate}
        isGenerating={isAiGenerating}
        promptRef={aiPromptRef}
        hasApiKey={!!apiKey}
        error={aiError}
        onClearError={clearAiError}
      />

      {/* ── History Panel ─────────────────────────────────── */}
      {showHistory && (
        <HistoryPanel 
          history={history as unknown as QueryHistoryEntry[]} 
          clearHistory={clearHistory} 
          removeEntry={removeEntry} 
        />
      )}

      {/* ── FROM ─────────────────────────────────────────── */}
      <div className="row">
        <label className="field">
          <span>Table</span>
          <input data-testid="sql-table-input" value={sqlTable}
            onChange={(e) => s.setSqlTable(e.target.value)} placeholder="e.g. users" />
        </label>
        <label className="field">
          <span>Columns</span>
          <input data-testid="sql-columns-input" value={sqlColumns}
            onChange={(e) => s.setSqlColumns(e.target.value)} placeholder="e.g. id, name, COUNT(*) AS total" />
        </label>
        <label className="checkbox" title="SELECT DISTINCT">
          <input type="checkbox" checked={sqlDistinct}
            onChange={(e) => s.setSqlDistinct(e.target.checked)} />
          <span>DISTINCT</span>
        </label>
      </div>

      {/* ── JOIN ─────────────────────────────────────────── */}
      <div className="whereHeader">
        <h3>JOIN</h3>
        <button type="button" data-testid="sql-add-join" onClick={h.addJoin}>+ Add JOIN</button>
      </div>
      {sqlJoins.length === 0 ? (
        <p className="hint">No joins added.</p>
      ) : (
        <div className="conditions">
          {sqlJoins.map((join) => (
            <div className="conditionRow" key={join.id}>
              <label className="field small">
                <span>Type</span>
                <select value={join.type} onChange={(e) => h.updateJoin(join.id, { type: e.target.value as SqlJoinType })}>
                  {JOIN_TYPES.map((jt) => <option key={jt.value} value={jt.value}>{jt.label}</option>)}
                </select>
              </label>
              <label className="field small">
                <span>Table</span>
                <input value={join.table} onChange={(e) => h.updateJoin(join.id, { table: e.target.value })} placeholder="e.g. orders" />
              </label>
              <label className="field">
                <span>ON condition</span>
                <input value={join.on} onChange={(e) => h.updateJoin(join.id, { on: e.target.value })}
                  placeholder="e.g. users.id = orders.user_id" />
              </label>
              <button type="button" className="danger" onClick={() => h.removeJoin(join.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* ── WHERE ────────────────────────────────────────── */}
      <ConditionsSection title="WHERE" testIdPrefix="sql-condition"
        conditions={sqlWhere} onAdd={h.addWhere} onUpdate={h.updateWhere} onRemove={h.removeWhere} />

      <div className="divider" />

      {/* ── GROUP BY + HAVING ─────────────────────────────── */}
      <div className="row">
        <label className="field">
          <span>GROUP BY (comma-separated)</span>
          <input value={sqlGroupBy} onChange={(e) => s.setSqlGroupBy(e.target.value)} placeholder="e.g. status, department" />
        </label>
      </div>

      <ConditionsSection title="HAVING" testIdPrefix="sql-having"
        conditions={sqlHaving} onAdd={h.addHaving} onUpdate={h.updateHaving} onRemove={h.removeHaving} />

      <div className="divider" />

      {/* ── ORDER BY ─────────────────────────────────────── */}
      <div className="whereHeader">
        <h3>ORDER BY</h3>
        <button type="button" onClick={h.addOrder}>+ Add sort</button>
      </div>
      {sqlOrderBys.length === 0 ? (
        <p className="hint">No sort columns.</p>
      ) : (
        <div className="conditions">
          {sqlOrderBys.map((o, idx) => (
            <div className="conditionRow" key={o.id}>
              <label className="field">
                <span>Field</span>
                <input value={o.field} onChange={(e) => h.updateOrder(o.id, { field: e.target.value })}
                  placeholder="e.g. created_at" />
              </label>
              <label className="field small">
                <span>Direction</span>
                <select value={o.direction} onChange={(e) => h.updateOrder(o.id, { direction: e.target.value as SqlOrderDirection })}>
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </label>
              <button type="button" className="danger" onClick={() => h.removeOrder(o.id)}
                disabled={sqlOrderBys.length <= 1 && idx === 0}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* ── LIMIT / OFFSET / Options ─────────────────────── */}
      <div className="row" style={{ marginTop: '0.75rem' }}>
        <label className="field small">
          <span>LIMIT</span>
          <input value={sqlLimit} onChange={(e) => s.setSqlLimit(e.target.value)} placeholder="optional" />
        </label>
        <label className="field small">
          <span>OFFSET</span>
          <input value={sqlOffset} onChange={(e) => s.setSqlOffset(e.target.value)} placeholder="optional" />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={sqlQuoteIdentifiers}
            onChange={(e) => s.setSqlQuoteIdentifiers(e.target.checked)} />
          <span>Quote identifiers</span>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={sqlIncludeSemicolon}
            onChange={(e) => s.setSqlIncludeSemicolon(e.target.checked)}
            data-testid="sql-include-semicolon" />
          <span>Include semicolon</span>
        </label>
      </div>

      {/* ── Validation Warnings ───────────────────────────── */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {warnings.map((w) => (
            <div key={w.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.55rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem',
              background: w.severity === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
              border: `1px solid ${w.severity === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
              color: w.severity === 'error' ? '#fca5a5' : '#fde68a',
            }}>
              <span>{w.severity === 'error' ? '⛔' : '⚠️'}</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Output ───────────────────────────────────────── */}
      <div className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <SqlHighlighter code={sqlOutput} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button type="button" className="copy"
          onClick={handleRun} disabled={!sqlOutput || isRunning} style={{ flex: 1.5, background: 'var(--accent-primary)', color: 'white' }}>
          {isRunning ? '⚡ Running...' : '▶ Run Query'}
        </button>
        <button type="button" className="copy"
          onClick={handleCopy} disabled={!sqlOutput} style={{ flex: 1 }}>
          Copy SQL
        </button>
        <button type="button" className="secondary"
          onClick={handleSaveTemplate} disabled={!sqlOutput} style={{ flex: 1 }}>
          📁 Save Template
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
          }} disabled={!sqlOutput} title="Copy shareable URL" style={{ flex: 1 }}>
          🔗 Share Link
        </button>
        <button type="button" className="secondary"
          onClick={() => downloadSql(sqlOutput, `select_${sqlTable || 'query'}`)} disabled={!sqlOutput} style={{ flex: 1 }}>
          ⬇ Download .sql
        </button>
      </div>

      {/* ── Mock Results ─────────────────────────────────── */}
      {results && (
        <div className="results-panel" style={{ 
          marginTop: '1.5rem', 
          background: 'var(--input-bg)', 
          borderRadius: '12px', 
          border: '1px solid var(--panel-border)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '0.9rem' }}>Query Results (Mock)</strong>
            <button type="button" className="secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setResults(null)}>Close</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sql-results-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {results.columns.map(c => <th key={c} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--panel-border)' }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row) => (
                  <tr key={row.__id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {results.columns.map(c => <td key={`${row.__id}-${c}`} style={{ padding: '0.75rem' }}>{row[c]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
