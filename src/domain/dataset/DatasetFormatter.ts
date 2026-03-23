export type DatasetDelimiter = string
export type DatasetQuoteStyle = 'none' | 'single' | 'double'
export type DatasetOutputWrap = 'none' | 'paren' | 'in'

export interface DatasetFormatSettings {
  delimiter: DatasetDelimiter
  quoteStyle: DatasetQuoteStyle
  escapeQuotes: boolean
  wrapOutput: DatasetOutputWrap
  trimWhitespace: boolean
  removeEmptyLines: boolean
  removeDuplicates: boolean
  sortAscending: boolean
  dedupeCaseInsensitive: boolean
}

export interface DatasetFormatter {
  format(input: string, settings: DatasetFormatSettings): string
}

