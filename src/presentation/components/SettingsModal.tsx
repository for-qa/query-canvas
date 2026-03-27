import { useState, useEffect, useRef } from 'react'
import { useAiSettings } from '../../application/useAiSettings'

export function SettingsModal({ onClose }: { readonly onClose: () => void }) {
  const { apiKey, setApiKey, clearApiKey, hasKey } = useAiSettings()
  const [draft, setDraft] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open the native dialog and focus the input
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Close on Escape (native dialog handles this, but we still call onClose to unmount)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    setApiKey(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    clearApiKey()
    setDraft('')
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 1000,
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, 92vw)',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        padding: '2rem',
        color: 'var(--text-h)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>⚙️ AI Settings</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Configure Gemini API key for the AI SQL Assistant
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: '1.4rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1,
          }}
          aria-label="Close settings"
        >×</button>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1.25rem', padding: '0.6rem 1rem',
        borderRadius: '10px',
        background: hasKey ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${hasKey ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
      }}>
        <span style={{ fontSize: '1rem' }}>{hasKey ? '✅' : '❌'}</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-h)' }}>
          {hasKey ? 'API key configured — AI Assistant is active' : 'No API key — AI Assistant will use mock mode'}
        </span>
      </div>

      {/* Key input */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-h)' }}>
          Gemini API Key
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            autoFocus
            type={showKey ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="AIza..."
            style={{
              flex: 1, padding: '0.7rem 1rem', borderRadius: '10px',
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--text-h)', fontFamily: 'var(--mono)', fontSize: '0.9rem',
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            title={showKey ? 'Hide key' : 'Show key'}
            style={{
              padding: '0.7rem 0.9rem', borderRadius: '10px',
              border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.07)',
              color: 'var(--text-h)', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
      </label>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
        Get a free key at{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
          style={{ color: 'var(--accent)' }}>
          aistudio.google.com/apikey
        </a>. Key is stored only in your browser (localStorage).
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!draft.trim()}
          style={{
            flex: 1, padding: '0.75rem', borderRadius: '10px',
            background: saved ? 'rgba(34,197,94,0.2)' : 'var(--accent-gradient)',
            color: 'white', fontWeight: 700, fontSize: '0.95rem',
            border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none',
            cursor: draft.trim() ? 'pointer' : 'not-allowed', opacity: draft.trim() ? 1 : 0.5,
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✅ Saved!' : 'Save Key'}
        </button>
        {hasKey && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '0.75rem 1.25rem', borderRadius: '10px',
              border: '1px solid var(--danger-border)', background: 'var(--danger-bg)',
              color: 'var(--danger-text)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '0.75rem 1.25rem', borderRadius: '10px',
            border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.07)',
            color: 'var(--text-h)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </dialog>
  )
}
