import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function GuideModal({ onClose }: { readonly onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const location = useLocation()

  // Open the native dialog
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [onClose])

  let title = 'App Guide'
  let description = 'Learn how to use QueryCanvas features.'
  let content = null

  switch (location.pathname) {
    case '/formatter':
    case '/':
      title = 'Dataset Formatter Guide'
      description = 'Format and clean raw datasets for SQL queries.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>What it does</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Takes raw pasted data (like CSV or copied spreadsheet cells) and transforms it into a clean list, optionally formatted for SQL <code>IN</code> clauses.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>How to use</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li>Paste your raw data into the <strong>"Paste dataset"</strong> box.</li>
              <li>Select your input delimiter (e.g., Comma, Tab, Newline).</li>
              <li>Choose if you want to wrap the output in quotes.</li>
              <li>Toggle advanced options like <strong>"Remove duplicates"</strong> or <strong>"Sort ascending"</strong>.</li>
              <li>Click <strong>"Format now"</strong> to see the result.</li>
            </ul>
          </div>
          <div style={{ background: 'var(--code-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Example Placeholder:</h4>
            <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '0.8rem', opacity: 0.8 }}>
              Input: <br />
              <code>apple, banana, cherry, apple</code><br /><br />
              Settings: Quote: Single, Wrap: SQL IN, Remove duplicates: Checked<br /><br />
              Output: <br />
              <code>IN ('apple', 'banana', 'cherry')</code>
            </p>
          </div>
        </div>
      )
      break
    case '/insert':
      title = 'INSERT Builder Guide'
      description = 'Generate full SQL INSERT blocks from raw rows.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>What it does</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Creates batch <code>INSERT INTO</code> statements by parsing raw text rows into SQL tuples automatically.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>How to use</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li>Set your target <strong>Table name</strong>.</li>
              <li>Define the <strong>Columns</strong> (comma-separated).</li>
              <li>Paste raw rows (one row per line). Values separated by comma or tab.</li>
              <li>The builder will format strings properly and leave numbers unquoted automatically.</li>
            </ul>
          </div>
          <div style={{ background: 'var(--code-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Example Placeholder:</h4>
            <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '0.8rem', opacity: 0.8 }}>
              Input: <br />
              <code>1, Alice, Admin</code><br />
              <code>2, Bob, User</code><br /><br />
              Output: <br />
              <code>INSERT INTO users (id, name, role)</code><br />
              <code>VALUES (1, 'Alice', 'Admin'), (2, 'Bob', 'User');</code>
            </p>
          </div>
        </div>
      )
      break
    case '/templates':
      title = 'Template Library Guide'
      description = 'Manage and reuse your saved SQL snippets.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>What it does</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Acts as your personal vault for database queries and schemas, categorized by the tool that created them.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>How to use</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li>Save queries from the <strong>SQL Builder</strong> or schemas from the <strong>DDL Builder</strong>.</li>
              <li>Use the search box to find a template by keyword or snippet.</li>
              <li>Filter by tool type using the tabs.</li>
              <li>Copy, Download to <code>.sql</code>, or Import/Export your whole library as JSON for backup.</li>
            </ul>
          </div>
        </div>
      )
      break
    case '/sql':
      title = 'SQL Builder Guide'
      description = 'Construct SELECT queries visually with AI assistance.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px dashed rgba(34, 197, 94, 0.4)' }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>✨</span> AI Assistant
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
              If you have set your Gemini API key in settings (⚙️), just type what you want in plain English (e.g., <strong>"Get users who signed up this year ordered by name"</strong>) and click Generate!
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Manual Visual Builder</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li><strong>Table & Columns:</strong> Specify the main table and fields to select.</li>
              <li><strong>Joins:</strong> Add JOIN clauses to fetch data from related tables.</li>
              <li><strong>Filters (WHERE):</strong> Add condition rows. Click <strong>AND / OR</strong> to chain logic. Group conditions using the parenthesis buttons.</li>
              <li><strong>Grouping & Output:</strong> Set GROUP BY, ORDER BY, LIMIT, and OFFSET.</li>
            </ul>
          </div>
        </div>
      )
      break
    case '/tools':
      title = 'Power Tools Guide'
      description = 'Utility functions for formatting and comparing schemas.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Beautifier</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Paste unformatted, single-line, or messy SQL into the left box. Click <strong>Format SQL</strong> to apply standard indentation and capitalization.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Schema Diff</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Paste your original schema on the left, and a modified schema on the right. The tool will highlight newly added (➕) or removed (➖) lines and columns.
            </p>
          </div>
        </div>
      )
      break
    case '/table-sql':
      title = 'Table → SQL Guide'
      description = 'An editable spreadsheet to generate INSERT queries.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>What it does</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Provides a grid interface. As you type, the `INSERT` query updates in real-time below.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>How to use</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li><strong>Manual:</strong> Click "+ Add column" or "+ Add row" to build your table structure. Type values directly into the cells.</li>
              <li><strong>Import:</strong> Click "Choose SQL file" and select an existing <code>INSERT</code> query file. It will parse the SQL and turn it back into an editable grid!</li>
            </ul>
          </div>
        </div>
      )
      break
    case '/ddl':
      title = 'DDL Builder Guide'
      description = 'Design databases and tables without writing CREATE code.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Table Builder</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li>Set the table name and add column definitions.</li>
              <li>For each column, choose the Type, Primary Key status, Not Null, Auto Increment, and Default values.</li>
              <li>Click <strong>Save Template</strong> to keep your schema design in the Template Library.</li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Database & Drops</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Use the extra tabs to generate <code>CREATE DATABASE</code>, <code>DROP TABLE</code>, or <code>TRUNCATE</code> scripts accurately.
            </p>
          </div>
        </div>
      )
      break
    case '/alter-table':
      title = 'ALTER TABLE Guide'
      description = 'Safely generate scripts to mutate existing tables.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>What it does</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              Instead of remembering dial-specific ALTER syntax, visually plan changes.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Actions</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li><strong>Add Column:</strong> Define a new column to insert into the table.</li>
              <li><strong>Drop Column:</strong> Remove a column safely.</li>
              <li><strong>Rename Column/Table:</strong> Change identifier names.</li>
              <li><strong>Drop/Add Constraints:</strong> Manage Primary, Foreign, and Unique Keys.</li>
            </ul>
          </div>
        </div>
      )
      break
    case '/dml':
      title = 'UPDATE / DELETE Guide'
      description = 'Construct data manipulation queries with precision.'
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>How to use</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <li>Select your query type (<strong>UPDATE</strong> or <strong>DELETE</strong>) from the tabs.</li>
              <li><strong>Set Values (Update only):</strong> Define the fields to update and the new static values or expressions.</li>
              <li><strong>WHERE Clauses:</strong> Critically, define the conditions to ensure you don't overwrite or delete the entire table accidentally.</li>
              <li>Preview the generated, dialect-aware SQL in real-time.</li>
            </ul>
          </div>
        </div>
      )
      break
    default:
      content = <p>No specific guide available for this page.</p>
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      style={{
        padding: 0,
        border: 'none',
        background: 'transparent',
        overflow: 'visible',
      }}
    >
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, 92vw)',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--panel-border)',
        borderRadius: '24px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        color: 'var(--text-h)',
        zIndex: 1001,
      }}>
        {/* Header (Sticky) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          padding: '2rem 2rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>ℹ️ {title}</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: '1.4rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1,
            }}
            aria-label="Close guide"
          >×</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ 
          padding: '1.5rem 2rem', 
          overflowY: 'auto',
          flex: 1
        }}>
          {content}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1rem 2rem 1.5rem', 
          borderTop: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            className="copy"
            style={{ margin: 0 }}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </dialog>
  )
}
