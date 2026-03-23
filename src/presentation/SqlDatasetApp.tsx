import { useEffect, useMemo, useState } from 'react'
import type {
  DatasetFormatSettings,
  DatasetDelimiter,
  DatasetQuoteStyle,
  DatasetOutputWrap,
} from '../domain/dataset/DatasetFormatter'
import type {
  SqlCondition,
  SqlConditionOperator,
  SqlOrderDirection,
  SqlQuery,
} from '../domain/sql/SqlModels'
import type { AppUseCases } from '../compositionRoot'

type SqlConditionDraft = Omit<SqlCondition, 'connector'> & {
  connector: 'AND' | 'OR'
}

const datasetDelimiterOptions: Array<{ label: string; value: DatasetDelimiter }> = [
  { label: 'Comma (,)', value: ',' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Tab (\\t)', value: '\t' },
  { label: 'Pipe (|)', value: '|' },
  { label: 'Space ( )', value: ' ' },
]
const datasetQuoteOptions: Array<{ label: string; value: DatasetQuoteStyle }> = [
  { label: 'None', value: 'none' },
  { label: "Single (')", value: 'single' },
  { label: 'Double (")', value: 'double' },
]
const datasetWrapOptions: Array<{ label: string; value: DatasetOutputWrap }> = [
  { label: 'None', value: 'none' },
  { label: 'Parentheses (...)', value: 'paren' },
  { label: 'SQL IN (...)', value: 'in' },
]

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

export function SqlDatasetApp({ useCases }: { useCases: AppUseCases }) {
  // Dataset formatter state
  const [datasetInput, setDatasetInput] = useState<string>('123\n234')
  const [datasetDelimiter, setDatasetDelimiter] = useState<DatasetDelimiter>(',')
  const [datasetQuoteStyle, setDatasetQuoteStyle] = useState<DatasetQuoteStyle>('none')
  const [datasetEscapeQuotes, setDatasetEscapeQuotes] = useState<boolean>(true)
  const [datasetWrapOutput, setDatasetWrapOutput] = useState<DatasetOutputWrap>('none')
  const [datasetTrimWhitespace, setDatasetTrimWhitespace] = useState<boolean>(true)
  const [datasetRemoveEmptyLines, setDatasetRemoveEmptyLines] = useState<boolean>(true)
  const [datasetRemoveDuplicates, setDatasetRemoveDuplicates] = useState<boolean>(false)
  const [datasetSortAscending, setDatasetSortAscending] = useState<boolean>(false)
  const [datasetDedupeCaseInsensitive, setDatasetDedupeCaseInsensitive] =
    useState<boolean>(false)

  const datasetSettings: DatasetFormatSettings = useMemo(
    () => ({
      delimiter: datasetDelimiter,
      quoteStyle: datasetQuoteStyle,
      escapeQuotes: datasetEscapeQuotes,
      wrapOutput: datasetWrapOutput,
      trimWhitespace: datasetTrimWhitespace,
      removeEmptyLines: datasetRemoveEmptyLines,
      removeDuplicates: datasetRemoveDuplicates,
      sortAscending: datasetSortAscending,
      dedupeCaseInsensitive: datasetDedupeCaseInsensitive,
    }),
    [
      datasetDelimiter,
      datasetQuoteStyle,
      datasetEscapeQuotes,
      datasetWrapOutput,
      datasetDedupeCaseInsensitive,
      datasetRemoveDuplicates,
      datasetRemoveEmptyLines,
      datasetSortAscending,
      datasetTrimWhitespace,
    ]
  )

  const [datasetOutput, setDatasetOutput] = useState<string>('')
  useEffect(() => {
    setDatasetOutput(useCases.formatDataset.execute(datasetInput, datasetSettings))
  }, [datasetInput, datasetSettings, useCases])

  // SQL builder state
  const [sqlTable, setSqlTable] = useState<string>('users')
  const [sqlColumns, setSqlColumns] = useState<string>('id, name')
  const [sqlWhere, setSqlWhere] = useState<SqlConditionDraft[]>([])
  const [sqlGroupBy, setSqlGroupBy] = useState<string>('')
  const [sqlOrderByField, setSqlOrderByField] = useState<string>('')
  const [sqlOrderByDirection, setSqlOrderByDirection] =
    useState<SqlOrderDirection>('ASC')
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
    <div className="app">
      <header className="appHeader">
        <h1>SQL Builder + Dataset Formatter</h1>
        <p>
          Format pasted datasets into one line, and generate a simple{' '}
          <code>SELECT</code> query.
        </p>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Dataset Formatter</h2>

          <label className="field">
            <span>Paste dataset</span>
            <textarea
              data-testid="dataset-input"
              value={datasetInput}
              onChange={(e) => setDatasetInput(e.target.value)}
              rows={8}
            />
          </label>

          <div className="row">
            <label className="field">
              <span>Delimiter</span>
              <select
                data-testid="dataset-delimiter-select"
                value={datasetDelimiter}
                onChange={(e) => setDatasetDelimiter(e.target.value)}
              >
                {datasetDelimiterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Quote values</span>
              <select
                data-testid="dataset-quote-style-select"
                value={datasetQuoteStyle}
                onChange={(e) => setDatasetQuoteStyle(e.target.value as DatasetQuoteStyle)}
              >
                {datasetQuoteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Wrap output</span>
              <select
                data-testid="dataset-wrap-output-select"
                value={datasetWrapOutput}
                onChange={(e) => setDatasetWrapOutput(e.target.value as DatasetOutputWrap)}
              >
                {datasetWrapOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={datasetTrimWhitespace}
                onChange={(e) => setDatasetTrimWhitespace(e.target.checked)}
              />
              <span>Trim whitespace</span>
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={datasetEscapeQuotes}
                onChange={(e) => setDatasetEscapeQuotes(e.target.checked)}
                disabled={datasetQuoteStyle === 'none'}
              />
              <span>Escape quotes inside values</span>
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={datasetRemoveEmptyLines}
                onChange={(e) => setDatasetRemoveEmptyLines(e.target.checked)}
              />
              <span>Remove empty lines</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={datasetRemoveDuplicates}
                onChange={(e) => setDatasetRemoveDuplicates(e.target.checked)}
              />
              <span>Remove duplicates</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={datasetDedupeCaseInsensitive}
                onChange={(e) => setDatasetDedupeCaseInsensitive(e.target.checked)}
                disabled={!datasetRemoveDuplicates}
              />
              <span>Case-insensitive dedupe</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={datasetSortAscending}
                onChange={(e) => setDatasetSortAscending(e.target.checked)}
              />
              <span>Sort ascending (A-Z)</span>
            </label>
          </div>

          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setDatasetOutput(useCases.formatDataset.execute(datasetInput, datasetSettings))
              }
            >
              Format now
            </button>
          </div>

          <label className="field">
            <span>Formatted output</span>
            <textarea
              data-testid="dataset-output"
              value={datasetOutput}
              onChange={() => {}}
              readOnly
              rows={3}
            />
          </label>
          <button
            type="button"
            className="copy"
            onClick={() => navigator.clipboard.writeText(datasetOutput)}
          >
            Copy output
          </button>
        </section>

        <section className="panel">
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

          <div className="row">
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

          <div className="row">
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

          <label className="field">
            <span>Generated SQL</span>
            <textarea data-testid="sql-output" value={sqlOutput} readOnly rows={4} />
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
      </main>
    </div>
  )
}

