import { useMemo, useState } from 'react'
import type { SqlCondition, SqlConditionOperator, SqlOrderDirection, SqlQuery } from '../domain/sql/SqlModels'
import type { AppUseCases } from '../compositionRoot'

type SqlConditionDraft = Omit<SqlCondition, 'connector'> & {
  connector: 'AND' | 'OR'
}

const sqlOperators: Array<{ label: string; value: SqlConditionOperator }> = [
  { label: '=', value: '=' },
  { label: '!=', value: '!=' },
  { label: '>', value: '>' },
  { label: '>=', value: '>=' },
  { label: '<', value: '<' },
  { label: '<=', value: '<=' },
  { label: 'LIKE', value: 'LIKE' },
  { label: 'IN', value: 'IN' },
  { label: 'IS NULL', value: 'IS NULL' },
  { label: 'IS NOT NULL', value: 'IS NOT NULL' },
]

export function SqlQueryBuilderApp({ useCases }: { useCases: AppUseCases }) {
  const [sqlTable, setSqlTable] = useState<string>('users')
  const [sqlColumns, setSqlColumns] = useState<string>('id, name')
  const [sqlWhere, setSqlWhere] = useState<SqlConditionDraft[]>([])
  const [sqlGroupBy, setSqlGroupBy] = useState<string>('')
  const [sqlOrderByField, setSqlOrderByField] = useState<string>('')
  const [sqlOrderByDirection, setSqlOrderByDirection] = useState<SqlOrderDirection>('ASC')
  const [sqlLimit, setSqlLimit] = useState<string>('')
  const [sqlQuoteIdentifiers, setSqlQuoteIdentifiers] = useState<boolean>(false)
  const [sqlIncludeSemicolon, setSqlIncludeSemicolon] = useState<boolean>(true)

  const sqlOutput = useMemo(() => {
    const table = sqlTable.trim()
    if (!table) return ''

    const columns = sqlColumns
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    const groupBy = sqlGroupBy
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    const limitParsed = sqlLimit.trim().length ? Number.parseInt(sqlLimit, 10) : undefined

    const where: SqlCondition[] = sqlWhere.map((row) => ({
      connector: row.connector,
      field: row.field.trim(),
      operator: row.operator,
      value: row.value,
    }))

    const orderBy =
      sqlOrderByField.trim().length > 0
        ? { field: sqlOrderByField.trim(), direction: sqlOrderByDirection }
        : undefined

    const query: SqlQuery = {
      table,
      columns,
      where,
      groupBy,
      orderBy,
      limit: typeof limitParsed === 'number' && Number.isFinite(limitParsed) ? limitParsed : undefined,
      quoteIdentifiers: sqlQuoteIdentifiers,
      includeSemicolon: sqlIncludeSemicolon,
    }

    return useCases.buildSqlQuery.execute(query)
  }, [
    sqlColumns,
    sqlGroupBy,
    sqlIncludeSemicolon,
    sqlLimit,
    sqlOrderByDirection,
    sqlOrderByField,
    sqlQuoteIdentifiers,
    sqlTable,
    sqlWhere,
    useCases,
  ])

  function updateCondition(
    index: number,
    patch: Partial<SqlConditionDraft>
  ): void {
    setSqlWhere((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function addCondition(): void {
    setSqlWhere((prev) => [
      ...prev,
      {
        connector: prev.length === 0 ? 'AND' : 'AND',
        field: '',
        operator: '=',
        value: '',
      },
    ])
  }

  function removeCondition(index: number): void {
    setSqlWhere((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <section className="panel sqlQueryBuilderPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <h2>SQL Query Builder</h2>

      <div className="row">
        <label className="field">
          <span>Table</span>
          <input
            data-testid="sql-table-input"
            value={sqlTable}
            onChange={(e) => setSqlTable(e.target.value)}
            placeholder="e.g. users"
          />
        </label>

        <label className="field">
          <span>Columns</span>
          <input
            data-testid="sql-columns-input"
            value={sqlColumns}
            onChange={(e) => setSqlColumns(e.target.value)}
            placeholder="e.g. id, name"
          />
        </label>
      </div>

      <div className="whereHeader">
        <h3>WHERE</h3>
        <button type="button" data-testid="sql-add-condition" onClick={addCondition}>
          Add condition
        </button>
      </div>

      {sqlWhere.length === 0 ? (
        <p className="hint">Add one or more conditions.</p>
      ) : (
        <div className="conditions">
          {sqlWhere.map((row, idx) => {
            const valueDisabled = row.operator === 'IS NULL' || row.operator === 'IS NOT NULL'
            return (
              <div className="conditionRow" key={idx}>
                {idx > 0 ? (
                  <label className="field small">
                    <span>Connector</span>
                    <select
                      value={row.connector}
                      onChange={(e) =>
                        updateCondition(idx, {
                          connector: e.target.value as 'AND' | 'OR',
                        })
                      }
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </label>
                ) : null}

                <label className="field small">
                  <span>Field</span>
                  <input
                    data-testid={`sql-condition-field-${idx}`}
                    value={row.field}
                    onChange={(e) => updateCondition(idx, { field: e.target.value })}
                    placeholder="e.g. age"
                  />
                </label>

                <label className="field small">
                  <span>Operator</span>
                  <select
                    data-testid={`sql-condition-operator-${idx}`}
                    value={row.operator}
                    onChange={(e) =>
                      updateCondition(idx, {
                        operator: e.target.value as SqlConditionOperator,
                        value: valueDisabled ? row.value : row.value,
                      })
                    }
                  >
                    {sqlOperators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Value</span>
                  <input
                    data-testid={`sql-condition-value-${idx}`}
                    value={row.value ?? ''}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder={row.operator === 'IN' ? 'e.g. 1,2,3' : 'e.g. 18'}
                    disabled={valueDisabled}
                  />
                </label>

                <button
                  type="button"
                  className="danger"
                  onClick={() => removeCondition(idx)}
                  aria-label={`Remove condition ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="divider" />

      <div className="row sqlQueryGroupRow">
        <label className="field">
          <span>GROUP BY (comma separated)</span>
          <input value={sqlGroupBy} onChange={(e) => setSqlGroupBy(e.target.value)} />
        </label>

        <label className="field">
          <span>ORDER BY field</span>
          <input value={sqlOrderByField} onChange={(e) => setSqlOrderByField(e.target.value)} />
        </label>

        <label className="field small">
          <span>Direction</span>
          <select
            value={sqlOrderByDirection}
            onChange={(e) => setSqlOrderByDirection(e.target.value as SqlOrderDirection)}
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </label>
      </div>

      <div className="row sqlQueryLimitRow">
        <label className="field small">
          <span>LIMIT</span>
          <input value={sqlLimit} onChange={(e) => setSqlLimit(e.target.value)} placeholder="optional" />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={sqlQuoteIdentifiers}
            onChange={(e) => setSqlQuoteIdentifiers(e.target.checked)}
          />
          <span>Quote identifiers</span>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={sqlIncludeSemicolon}
            onChange={(e) => setSqlIncludeSemicolon(e.target.checked)}
            data-testid="sql-include-semicolon"
          />
          <span>Include semicolon</span>
        </label>
      </div>

      <label className="field sqlQueryOutputField">
        <span>Generated SQL</span>
        <textarea data-testid="sql-output" value={sqlOutput} readOnly rows={8} />
      </label>

      <button
        type="button"
        className="copy"
        onClick={() => navigator.clipboard.writeText(sqlOutput)}
        disabled={!sqlOutput}
      >
        Copy SQL
      </button>
    </section>
  )
}
