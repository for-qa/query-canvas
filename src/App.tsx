import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createAppUseCases } from './compositionRoot'
import { Layout } from './presentation/Layout'
import { DatasetFormatterApp } from './presentation/DatasetFormatterApp'
import { SqlQueryBuilderApp } from './presentation/SqlQueryBuilderApp'
import { SqlTableEditorApp } from './presentation/SqlTableEditorApp'
import { SqlDdlBuilderApp } from './presentation/SqlDdlBuilderApp'
import { SqlAlterTableApp } from './presentation/SqlAlterTableApp'
import { SqlDmlBuilderApp } from './presentation/SqlDmlBuilderApp'
import { DialectProvider } from './presentation/DialectContext'

const useCases = createAppUseCases()

function App() {
  return (
    <DialectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/formatter" replace />} />
            <Route path="formatter" element={<DatasetFormatterApp useCases={useCases} />} />
            <Route path="sql" element={<SqlQueryBuilderApp useCases={useCases} />} />
            <Route path="table-sql" element={<SqlTableEditorApp />} />
            <Route path="ddl" element={<SqlDdlBuilderApp useCases={useCases} />} />
            <Route path="alter-table" element={<SqlAlterTableApp useCases={useCases} />} />
            <Route path="dml" element={<SqlDmlBuilderApp useCases={useCases} />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DialectProvider>
  )
}

export default App
