import { useState, useRef, useEffect, useCallback } from 'react'
import { exportFile } from '../../application/exportFile'
import type { ExportFormat } from '../../application/exportFile'

const FORMAT_OPTIONS: Array<{ format: ExportFormat; label: string; ext: string; icon: string }> = [
  { format: 'sql',  label: 'SQL File',           ext: '.sql',  icon: '🗄️' },
  { format: 'csv',  label: 'CSV File',            ext: '.csv',  icon: '📄' },
  { format: 'xlsx', label: 'Excel Spreadsheet',   ext: '.xlsx', icon: '📊' },
  { format: 'txt',  label: 'Plain Text',          ext: '.txt',  icon: '📝' },
]

interface ExportButtonProps {
  content: string
  filenameBase: string
  disabled?: boolean
  /** Override button display label */
  label?: string
  /** Extra inline styles for wrapper */
  style?: React.CSSProperties
  /**
   * Optional custom handler. If provided, called instead of the
   * default exportFile(). Useful for adding confirmation dialogs.
   */
  onExport?: (format: ExportFormat) => void
}

/**
 * A split dropdown button that lets the user choose
 * which file format to export SQL content as.
 */
export function ExportButton({
  content,
  filenameBase,
  disabled = false,
  label = 'Export',
  style,
  onExport,
}: Readonly<ExportButtonProps>) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleExport = useCallback((format: ExportFormat) => {
    if (onExport) {
      onExport(format)
    } else {
      exportFile(content, filenameBase, format)
    }
    setOpen(false)
  }, [content, filenameBase, onExport])

  return (
    <div ref={wrapRef} className="exportBtnWrap" style={style}>
      <button
        type="button"
        className="secondary exportBtn"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Choose export format"
      >
        ⬇ {label}
        <span className={`exportCaret${open ? ' open' : ''}`}>▾</span>
      </button>

      {open && !disabled && (
        <div className="exportDropdown" role="menu" aria-label="Export format">
          {FORMAT_OPTIONS.map(({ format, label: fmtLabel, ext, icon }) => (
            <button
              key={format}
              type="button"
              className="exportDropdownItem"
              onClick={() => handleExport(format)}
              role="menuitem"
            >
              <span className="exportItemIcon">{icon}</span>
              <span className="exportItemLabel">{fmtLabel}</span>
              <code className="exportItemExt">{ext}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
