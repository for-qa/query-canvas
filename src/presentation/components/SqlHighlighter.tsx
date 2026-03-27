import { useEffect, useRef } from 'react'
import Prism from 'prismjs'
// Load SQL components for Prism
import 'prismjs/components/prism-sql'
// Choose a theme (e.g. Tomorrow Night for dark mode)
// We will manage theme via CSS variables if possible, but let's use a nice one.
import 'prismjs/themes/prism-tomorrow.css'

interface SqlHighlighterProps {
  readonly code: string
}

/**
 * A syntax-highlighted code block for SQL.
 * Replaces simple textareas for a more premium look.
 */
export function SqlHighlighter({ code }: SqlHighlighterProps) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
  }, [code])

  return (
    <pre className="sql-highlighter">
      <code ref={codeRef} className="language-sql">
        {code}
      </code>
    </pre>
  )
}
