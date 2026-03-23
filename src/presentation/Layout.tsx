import { Outlet, NavLink } from 'react-router-dom'
import './Layout.css'

export function Layout() {
  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="brandTitle">QueryCanvas</div>
            <div className="brandSubtitle">
              Format datasets and generate simple SQL queries.
            </div>
          </div>

          <nav className="tabs" aria-label="Primary navigation">
            <NavLink
              to="/formatter"
              className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
            >
              Dataset Formatter
            </NavLink>
            <NavLink
              to="/sql"
              className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
            >
              SQL Builder
            </NavLink>
            <NavLink
              to="/table-sql"
              className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
            >
              Table to SQL
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
