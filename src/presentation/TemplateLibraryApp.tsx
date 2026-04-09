import { useState, useCallback } from 'react'
import { useSavedTemplates } from '../application/useSavedTemplates'
import { usePageTitle } from '../application/usePageTitle'
import { SqlHighlighter } from './components/SqlHighlighter'
import { ExportButton } from './components/ExportButton'

/**
 * Page to view and manage all named templates saved from various tools.
 */
export function TemplateLibraryApp() {
  usePageTitle('Template Library')
  const { templates, deleteTemplate, clearTemplates, saveTemplate } = useSavedTemplates()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'All' | 'SQL Builder' | 'DML Builder' | 'DDL Builder'>('All')

  const handleExport = useCallback(() => {
    const data = JSON.stringify(templates, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-canvas-templates-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [templates])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      void (async () => {
        try {
          const text = await file.text()
          const imported = JSON.parse(text)
          if (Array.isArray(imported)) {
            let count = 0
            for (const t of imported) {
              if (t && typeof t === 'object' && t.name && t.sql && t.tool) {
                const tool = t.tool as 'SQL Builder' | 'DML Builder' | 'DDL Builder'
                saveTemplate(t.name, t.sql, tool)
                count++
              }
            }
            alert(`Imported ${count} templates successfully!`)
          }
        } catch {
          alert('Failed to import templates: Invalid JSON file.')
        }
      })()
    }
    input.click()
  }, [saveTemplate])

  const filtered = templates.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tool.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === 'All') return matchesSearch
    return matchesSearch && t.tool === activeTab
  })

  const handleCopy = useCallback((sql: string) => {
    void navigator.clipboard.writeText(sql)
    alert('SQL copied from template!')
  }, [])

  return (
    <section className="panel templateLibraryPanel" style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Template Library</h2>
          <p className="hint" style={{ marginTop: '0.25rem' }}>Snippets and schema designs saved from across Query Canvas.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="secondary" onClick={handleExport} disabled={templates.length === 0}>⬆ Export JSON</button>
          <button type="button" className="secondary" onClick={handleImport}>⬇ Import JSON</button>
          {templates.length > 0 && <button type="button" className="danger" onClick={() => { if(confirm('Clear all?')) clearTemplates() }}>Clear library</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input 
            className="searchInput"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Search templates by name, tool or code..."
          />
        </div>
        <div className="tabs" style={{ background: 'var(--input-bg)', padding: '0.25rem', borderRadius: '10px', display: 'flex', gap: '0.25rem' }}>
          {(['All', 'SQL Builder', 'DML Builder', 'DDL Builder'] as const).map(tab => (
            <button key={tab} type="button" 
              className={activeTab === tab ? 'copy' : 'secondary'}
              style={{ padding: '0.4rem 0.8rem', width: 'auto', marginTop: 0, fontSize: '0.85rem' }}
              onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="emptyState" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--input-bg)', borderRadius: '16px', border: '1px dashed var(--panel-border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📂</div>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>No templates found matching your search.</p>
          {templates.length === 0 && <p className="hint">Save snippets from SQL Builder or DDL Builder components!</p>}
        </div>
      ) : (
        <div className="templateGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filtered.map(t => (
            <div key={t.id} className="templateCard" style={{ 
              background: 'var(--panel-bg)', 
              border: '1px solid var(--panel-border)', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'default'
            }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t.name}</h4>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.2rem 0.5rem', 
                    background: 'rgba(124, 77, 255, 0.2)', 
                    color: 'var(--accent-primary)',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>{t.tool}</span>
                </div>
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', opacity: 0.5 }}>
                  Last edited on {new Date(t.timestamp).toLocaleDateString()}
                </div>
              </div>
              <div style={{ padding: '1rem', flex: 1, maxHeight: '180px', overflowY: 'auto', background: 'var(--code-bg)' }}>
                <SqlHighlighter code={t.sql} />
              </div>
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="copy" onClick={() => handleCopy(t.sql)} style={{ flex: '1 1 auto', minWidth: '120px', padding: '0.6rem' }}>Copy SQL</button>
                <div style={{ display: 'flex', gap: '0.5rem', flex: '0 0 auto', alignItems: 'center' }}>
                  <ExportButton content={t.sql} filenameBase={t.name} label="Download" />
                  <button type="button" className="danger" onClick={() => deleteTemplate(t.id)} style={{ flex: 'none', padding: '0.6rem', minWidth: '2.5rem' }} title="Remove template">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
