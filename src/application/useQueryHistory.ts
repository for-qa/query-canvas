import { useState, useEffect, useCallback } from 'react'

export interface QueryHistoryEntry {
  id: string
  sql: string
  label: string
  timestamp: number
}

const STORAGE_KEY = 'querycanvas_history'
const MAX_ENTRIES = 20

function loadHistory(): QueryHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as QueryHistoryEntry[]
  } catch {
    return []
  }
}

function saveHistory(entries: QueryHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // storage quota exceeded – ignore
  }
}

export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistoryEntry[]>(loadHistory)

  useEffect(() => {
    saveHistory(history)
  }, [history])

  const addEntry = useCallback((sql: string, label: string) => {
    if (!sql.trim()) return
    setHistory((prev) => {
      // Don't add exact duplicate of most recent entry
      if (prev.length > 0 && prev[0].sql === sql) return prev
      const entry: QueryHistoryEntry = {
        id: crypto.randomUUID(),
        sql,
        label,
        timestamp: Date.now(),
      }
      const updated = [entry, ...prev].slice(0, MAX_ENTRIES)
      return updated
    })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  return { history, addEntry, removeEntry, clearHistory }
}
