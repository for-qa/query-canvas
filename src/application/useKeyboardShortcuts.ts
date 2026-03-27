import { useEffect, useCallback } from 'react'

type ShortcutMap = Record<string, () => void>

/**
 * Registers global keyboard shortcuts.
 * Keys are in the format: "ctrl+enter", "ctrl+shift+d", "ctrl+k", etc.
 * Modifier order: ctrl → shift → alt → key (all lowercase).
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push('ctrl')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')
      parts.push(e.key.toLowerCase())

      const combo = parts.join('+')
      if (shortcuts[combo]) {
        e.preventDefault()
        shortcuts[combo]()
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [handler])
}
