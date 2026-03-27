import { useState, useCallback, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import type { SqlDialect } from '../domain/sql/SqlDialect'
import { DialectContext, loadDialect, saveDialect } from './DialectContext'

/**
 * State provider for the SQL dialect selection.
 * Separated into its own file to ensure Vite Fast Refresh works correctly.
 */
export function DialectProvider({ children }: Readonly<PropsWithChildren>) {
  const [dialect, setDialect] = useState<SqlDialect>(loadDialect)

  const handleSetDialect = useCallback((d: SqlDialect) => {
    setDialect(d)
    saveDialect(d)
  }, [])

  const value = useMemo(() => ({ dialect, setDialect: handleSetDialect }), [dialect, handleSetDialect])

  return (
    <DialectContext.Provider value={value}>
      {children}
    </DialectContext.Provider>
  )
}
