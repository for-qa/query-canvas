import { useState, useCallback } from 'react'
import { format } from 'sql-formatter'
import { usePageTitle } from '../application/usePageTitle'
import { SqlHighlighter } from './components/SqlHighlighter'
import { useDialect } from './DialectContext'

type ToolMode = 'formatter' | 'diff'

export function SqlToolsApp() {
  usePageTitle('SQL Power Tools')
  const { dialect } = useDialect()
  const [mode, setMode] = useState<ToolMode>('formatter')

  // Formatter State
  const [formatInput, setFormatInput] = useState('')
  const [formatOutput, setFormatOutput] = useState('')

  // Diff State
  const [diffInput1, setDiffInput1] = useState('')
  const [diffInput2, setDiffInput2] = useState('')
  const [diffOutput, setDiffOutput] = useState<string[]>([])

  const handleDiff = useCallback(() => {
    // This is a naive implementation for demo
    const lines1 = diffInput1.split('\n').map(l => l.trim()).filter(Boolean)
    const lines2 = diffInput2.split('\n').map(l => l.trim()).filter(Boolean)
    
    const diffs: string[] = []
    if (lines1.length === 0 || lines2.length === 0) {
      setDiffOutput(['Please provide both schemas to compare.'])
      return
    }

    // Compare line by line (simple check)
    lines2.forEach(line => {
      if (!lines1.includes(line)) diffs.push(`➕ ADDED: ${line}`)
    })
    lines1.forEach(line => {
      if (!lines2.includes(line)) diffs.push(`➖ REMOVED: ${line}`)
    })

    if (diffs.length === 0) diffs.push('✅ Schemas are identical.')
    setDiffOutput(diffs)
  }, [diffInput1, diffInput2])

  const handleFormat = useCallback(() => {
    try {
      let language: 'postgresql' | 'mysql' | 'sql' = 'sql'
      if (dialect === 'postgresql') language = 'postgresql'
      else if (dialect === 'mysql') language = 'mysql'

      const formatted = format(formatInput, {
        language,
        keywordCase: 'upper',
      })
      setFormatOutput(formatted)
    } catch (err) {
      alert('Failed to format SQL: ' + (err as Error).message)
    }
  }, [formatInput, dialect])

  return (
    <section className="panel sqlToolsPanel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>SQL Power Tools</h2>
        <div className="tabs" style={{ background: 'var(--input-bg)', padding: '0.3rem', borderRadius: '12px', display: 'flex', gap: '0.3rem' }}>
          <button 
            type="button" 
            className={mode === 'formatter' ? 'copy' : 'secondary'} 
            onClick={() => setMode('formatter')}
            style={{ width: 'auto', marginTop: 0, padding: '0.4rem 1rem' }}
          >
            Beautifier
          </button>
          <button 
            type="button" 
            className={mode === 'diff' ? 'copy' : 'secondary'} 
            onClick={() => setMode('diff')}
            style={{ width: 'auto', marginTop: 0, padding: '0.4rem 1rem' }}
          >
            Schema Diff
          </button>
        </div>
      </div>

      {mode === 'formatter' && (
        <div className="formatter-tool">
          <p className="hint">Paste messy SQL and get perfectly formatted code.</p>
          <div className="row" style={{ alignItems: 'stretch', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <label className="field">
                <span>Input SQL</span>
                <textarea 
                  value={formatInput} 
                  onChange={(e) => setFormatInput(e.target.value)} 
                  rows={15} 
                  placeholder="SELECT * FROM users where id=1;"
                  style={{ fontFamily: 'monospace' }}
                />
              </label>
              <button type="button" className="copy" onClick={handleFormat} style={{ marginTop: '1rem' }}>Format SQL</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.8 }}>Formatted Output</span>
              <div style={{ flex: 1, border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <SqlHighlighter code={formatOutput} />
              </div>
              {formatOutput && (
                <button 
                  type="button" 
                  className="secondary" 
                  style={{ marginTop: '1rem' }}
                  onClick={() => navigator.clipboard.writeText(formatOutput)}
                >
                  Copy Formatted
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'diff' && (
        <div className="diff-tool">
          <p className="hint">Compare two SQL schemas to see structural differences.</p>
          <div className="row" style={{ gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <label className="field">
                <span>Schema A (Original)</span>
                <textarea 
                  value={diffInput1} 
                  onChange={(e) => setDiffInput1(e.target.value)} 
                  rows={10} 
                  placeholder="CREATE TABLE users (id INT)..." 
                  style={{ fontFamily: 'monospace' }}
                />
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <label className="field">
                <span>Schema B (New)</span>
                <textarea 
                  value={diffInput2} 
                  onChange={(e) => setDiffInput2(e.target.value)} 
                  rows={10} 
                  placeholder="CREATE TABLE users (id INT, email VARCHAR)..." 
                  style={{ fontFamily: 'monospace' }}
                />
              </label>
            </div>
          </div>
          <button type="button" className="copy" onClick={handleDiff} style={{ marginTop: '1rem' }}>Compare Schemas</button>
          
          {diffOutput.length > 0 && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1.5rem', 
              background: 'var(--input-bg)', 
              borderRadius: '8px', 
              border: '1px solid var(--panel-border)' 
            }}>
              <h4>Comparison Results</h4>
              <div style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {diffOutput.map((d) => {
                  let color = 'inherit';
                  if (d.startsWith('➕')) color = '#a6e22e';
                  else if (d.startsWith('➖')) color = '#f92672';
                  
                  return (
                    <div key={d} style={{ 
                      color,
                      marginBottom: '0.4rem',
                      padding: '0.4rem',
                      background: d.startsWith('✅') ? 'rgba(166, 226, 46, 0.1)' : 'transparent',
                      borderRadius: '4px'
                    }}>
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
