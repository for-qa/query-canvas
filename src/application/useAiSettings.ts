import { useState, useEffect } from 'react'

const STORAGE_KEY = 'qc_gemini_api_key'

/**
 * Manages the user's Gemini API key, persisted in localStorage.
 */
export function useAiSettings() {
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ''
  )

  // Keep in sync if another tab changes it
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setApiKeyState(e.newValue ?? '')
    }
    globalThis.addEventListener('storage', onStorage as EventListener)
    return () => globalThis.removeEventListener('storage', onStorage as EventListener)
  }, [])

  const setApiKey = (key: string) => {
    const trimmed = key.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setApiKeyState(trimmed)
  }

  const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEY)
    setApiKeyState('')
  }

  return { apiKey, setApiKey, clearApiKey, hasKey: apiKey.length > 0 }
}
