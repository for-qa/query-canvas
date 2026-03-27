import { useState, useCallback, useEffect } from 'react'

export interface SavedTemplate {
  id: string
  name: string
  sql: string
  tool: string // The builder tool that generated it (e.g. 'SQL Builder', 'DDL Builder')
  timestamp: string
}

const STORAGE_KEY = 'query_canvas_saved_templates'

/**
 * Hook to manage persistent, named SQL templates.
 */
export function useSavedTemplates() {
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (err) {
        console.error('Failed to parse saved templates:', err)
      }
    }
    return []
  })

  // Synchronize state to LocalStorage when it changes
  useEffect(() => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }, [templates])

  const saveTemplate = useCallback((name: string, sql: string, tool: string) => {
    const newTemplate: SavedTemplate = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Untitled Template',
      sql,
      tool,
      timestamp: new Date().toISOString(),
    }

    setTemplates(prev => {
      const updated = [newTemplate, ...prev]
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id)
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearTemplates = useCallback(() => {
    setTemplates([])
    globalThis.localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { templates, saveTemplate, deleteTemplate, clearTemplates }
}
