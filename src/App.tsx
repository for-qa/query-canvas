import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createAppUseCases } from './compositionRoot'
import { Layout } from './presentation/Layout'
import { DatasetFormatterApp } from './presentation/DatasetFormatterApp'
import { SqlQueryBuilderApp } from './presentation/SqlQueryBuilderApp'
import { SqlTableEditorApp } from './presentation/SqlTableEditorApp'

const useCases = createAppUseCases()

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/formatter" replace />} />
          <Route path="formatter" element={<DatasetFormatterApp useCases={useCases} />} />
          <Route path="sql" element={<SqlQueryBuilderApp useCases={useCases} />} />
          <Route path="table-sql" element={<SqlTableEditorApp />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
