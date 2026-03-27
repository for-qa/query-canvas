import { useEffect } from 'react'

const APP_NAME = 'QueryCanvas'

/**
 * Sets document.title to `${pageTitle} — QueryCanvas` while the component is mounted.
 * Restores the bare app name on unmount.
 */
export function usePageTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} \u2014 ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [pageTitle])
}
