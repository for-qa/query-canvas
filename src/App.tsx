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
import { SqlInsertBuilderApp } from './presentation/SqlInsertBuilderApp'
import { TemplateLibraryApp } from './presentation/TemplateLibraryApp'
import { SqlToolsApp } from './presentation/SqlToolsApp'
import { SpreadsheetImportApp } from './presentation/SpreadsheetImportApp'
import { DialectProvider } from './presentation/DialectProvider'
import { ThemeProvider } from './presentation/ThemeProvider'

const useCases = createAppUseCases()

function App() {
  return (
    <ThemeProvider>
      <DialectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/formatter" replace />} />
              <Route path="formatter" element={<DatasetFormatterApp useCases={useCases} />} />
              <Route path="insert" element={<SqlInsertBuilderApp useCases={useCases} />} />
              <Route path="templates" element={<TemplateLibraryApp />} />
              <Route path="sql" element={<SqlQueryBuilderApp useCases={useCases} />} />
              <Route path="tools" element={<SqlToolsApp />} />
              <Route path="table-sql" element={<SqlTableEditorApp />} />
              <Route path="ddl" element={<SqlDdlBuilderApp useCases={useCases} />} />
              <Route path="alter-table" element={<SqlAlterTableApp useCases={useCases} />} />
              <Route path="dml" element={<SqlDmlBuilderApp useCases={useCases} />} />
              <Route path="spreadsheet" element={<SpreadsheetImportApp />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DialectProvider>
    </ThemeProvider>
  )
}

export default App
