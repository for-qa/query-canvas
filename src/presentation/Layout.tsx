import { Outlet, NavLink } from 'react-router-dom'
import { useDialect } from './DialectContext'
import { DIALECT_CONFIGS } from '../domain/sql/SqlDialect'
import type { SqlDialect } from '../domain/sql/SqlDialect'
import './Layout.css'
import { useTheme } from './ThemeContext'
import { useState } from 'react'
import { SettingsModal } from './components/SettingsModal'
import { useAiSettings } from '../application/useAiSettings'

export function Layout() {
  const { theme, toggleTheme } = useTheme()
  const { dialect, setDialect } = useDialect()
  const { hasKey } = useAiSettings()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="brandTitle">QueryCanvas</div>
            <div className="brandSubtitle">Visual SQL query builder</div>
          </div>

          <nav className="tabs" aria-label="Primary navigation">
            <NavLink to="/formatter" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              Dataset Formatter
            </NavLink>
            <NavLink to="/insert" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              INSERT Builder
            </NavLink>
            <NavLink to="/templates" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              Templates
            </NavLink>
            <NavLink to="/sql" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              SQL Builder
            </NavLink>
            <NavLink to="/tools" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              Power Tools
            </NavLink>
            <NavLink to="/table-sql" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              Table → SQL
            </NavLink>
            <NavLink to="/ddl" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              DDL Builder
            </NavLink>
            <NavLink to="/alter-table" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              ALTER TABLE
            </NavLink>
            <NavLink to="/dml" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
              UPDATE / DELETE
            </NavLink>
          </nav>

          <div className="topbarControls">
            <select
              id="dialect-selector"
              className="dialectSelect"
              value={dialect}
              aria-label="SQL dialect"
              onChange={(e) => setDialect(e.target.value as SqlDialect)}
            >
              {Object.entries(DIALECT_CONFIGS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>

            <button
              type="button"
              className="themeToggle"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Settings button */}
            <button
              type="button"
              className="themeToggle"
              aria-label="AI Settings"
              title="AI Settings (Gemini API key)"
              onClick={() => setShowSettings(true)}
              style={{ position: 'relative' }}
            >
              ⚙️
              {hasKey && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, width: 7, height: 7,
                  borderRadius: '50%', background: '#22c55e', border: '1px solid var(--panel-bg)',
                }} />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
