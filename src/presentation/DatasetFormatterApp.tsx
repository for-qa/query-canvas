import { useEffect, useMemo, useState } from 'react'
import type {
  DatasetFormatSettings,
  DatasetDelimiter,
  DatasetQuoteStyle,
  DatasetOutputWrap,
} from '../domain/dataset/DatasetFormatter'
import type { AppUseCases } from '../compositionRoot'
import { usePageTitle } from '../application/usePageTitle'

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

export function DatasetFormatterApp({ useCases }: { useCases: AppUseCases }) {
  usePageTitle('Dataset Formatter')
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

  return (
    <section className="panel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
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
            onChange={(e) => setDatasetDelimiter(e.target.value as DatasetDelimiter)}
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
          rows={6}
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
  )
}
