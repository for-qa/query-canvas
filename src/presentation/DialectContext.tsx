import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import type { SqlDialect } from '../domain/sql/SqlDialect'

const STORAGE_KEY = 'querycanvas_dialect'
const VALID_DIALECTS = new Set<SqlDialect>(['mysql', 'postgresql', 'sqlite', 'mssql'])

function loadDialect(): SqlDialect {
  const saved = localStorage.getItem(STORAGE_KEY) as SqlDialect | null
  return saved && VALID_DIALECTS.has(saved) ? saved : 'mysql'
}

interface DialectContextValue {
  readonly dialect: SqlDialect
  readonly setDialect: (d: SqlDialect) => void
}

const DialectContext = createContext<DialectContextValue>({
  dialect: 'mysql',
  setDialect: () => {},
})

export function DialectProvider({ children }: Readonly<PropsWithChildren>) {
  const [dialect, setDialectState] = useState<SqlDialect>(loadDialect)

  const setDialect = useCallback((d: SqlDialect) => {
    setDialectState(d)
    localStorage.setItem(STORAGE_KEY, d)
  }, [])

  const value = useMemo(() => ({ dialect, setDialect }), [dialect, setDialect])

  return (
    <DialectContext.Provider value={value}>
      {children}
    </DialectContext.Provider>
  )
}

export function useDialect(): DialectContextValue {
  return useContext(DialectContext)
}

export type { SqlDialect }
