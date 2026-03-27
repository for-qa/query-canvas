import { useEffect, useState, useMemo, useCallback } from 'react'
import type { PropsWithChildren } from 'react'
import { ThemeContext } from './ThemeContext'
import type { Theme } from './ThemeContext'

/**
 * Persists the light/dark theme preference for the user.
 * Separated from Context definition to ensure Vite Fast Refresh works correctly.
 */
export function ThemeProvider({ children }: Readonly<PropsWithChildren>) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('querycanvas_theme') as Theme | null
    if (saved === 'dark' || saved === 'light') return saved
    return globalThis.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    // Satisfies lint by using dataset if preferred, or standard setAttribute
    document.documentElement.dataset.theme = theme
    localStorage.setItem('querycanvas_theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
