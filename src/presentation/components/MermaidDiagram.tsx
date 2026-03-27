import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif'
})

export function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chart && ref.current) {
      mermaid.render('mermaid-svg-' + Math.random().toString(36).substr(2, 9), chart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg
        }
      }).catch(err => {
        console.error('Mermaid render error:', err)
      })
    }
  }, [chart])

  return (
    <div 
      ref={ref} 
      className="mermaidContainer" 
      style={{ 
        background: 'var(--input-bg)', 
        padding: '1.5rem', 
        borderRadius: '12px', 
        minHeight: '150px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto',
        border: '1px solid var(--panel-border)'
      }}
    />
  )
}
