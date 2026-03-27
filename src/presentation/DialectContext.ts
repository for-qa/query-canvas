import { createContext, useContext } from 'react'
import type { SqlDialect } from '../domain/sql/SqlDialect'

const STORAGE_KEY = 'querycanvas_dialect'
const VALID_DIALECTS = new Set<SqlDialect>(['mysql', 'postgresql', 'sqlite', 'mssql'])

export function loadDialect(): SqlDialect {
  const saved = localStorage.getItem(STORAGE_KEY) as SqlDialect | null
  return saved && VALID_DIALECTS.has(saved) ? saved : 'mysql'
}

export function saveDialect(d: SqlDialect): void {
  localStorage.setItem(STORAGE_KEY, d)
}

export interface DialectContextValue {
  readonly dialect: SqlDialect
  readonly setDialect: (d: SqlDialect) => void
}

export const DialectContext = createContext<DialectContextValue>({
  dialect: 'mysql',
  setDialect: () => {},
})

export function useDialect(): DialectContextValue {
  return useContext(DialectContext)
}
