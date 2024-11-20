import React from "react"
import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import AdminPortal from "./pages/admin/AdminPortal"
import AdminManagement from "./pages/admin/admins"
import AdminPermissions from "./pages/admin/permissions"
import GameManagement from "./pages/admin/games"
import Game from "./pages/Game"
import Profile from "./pages/Profile"
import Players from "./pages/admin/players"
import EditPlayer from "./pages/admin/EditPlayer"
import { AuthProvider } from "./context/AuthContext"
import { supabase } from './utils/supabase'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import HistoricalGames from './pages/admin/history/HistoricalGames'
import PlayerList from './pages/PlayerList'
import PlayerProfile from './pages/PlayerProfile'

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/admin/admins" element={<AdminManagement />} />
            <Route path="/admin/permissions" element={<AdminPermissions />} />
            <Route path="/admin/games" element={<GameManagement />} />
            <Route path="/admin/players" element={<Players />} />
            <Route path="/admin/players/:id" element={<EditPlayer />} />
            <Route path="/games" element={<Game />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/history" element={<HistoricalGames />} />
            <Route path="/players" element={<PlayerList />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
          </Routes>
          <Toaster />
        </Layout>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App