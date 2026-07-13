import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store'
import { Layout } from './components/Layout'
import { Dashboard } from './routes/Dashboard'
import { EntityListPage } from './routes/EntityListPage'
import { EntityDetail } from './routes/EntityDetail'
import { History } from './routes/History'
import { TagsView } from './routes/TagsView'
import { Settings } from './routes/Settings'

function Splash() {
  return (
    <div className="flex h-full items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
      <div className="text-sm">Loading Upkeep…</div>
    </div>
  )
}

export function App() {
  const { ready } = useStore()
  if (!ready) return <Splash />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/properties" element={<EntityListPage kind="property" />} />
        <Route path="/systems" element={<EntityListPage kind="asset" />} />
        <Route path="/contacts" element={<EntityListPage kind="vendor" />} />
        <Route path="/e/:id" element={<EntityDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/tags" element={<TagsView />} />
        <Route path="/tags/:label" element={<TagsView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
