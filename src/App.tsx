import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Ranking from './pages/Ranking'
import TestPage from './pages/TestPage'
import SitesPage from './pages/SitesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="test" element={<TestPage />} />
        <Route path="sites" element={<SitesPage />} />
      </Route>
    </Routes>
  )
}
