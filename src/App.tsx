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
import PaymentDashboard from './components/admin/payments/PaymentDashboard'
import Ratings from './pages/Ratings'
import RatingsView from './pages/admin/ratings'
import Teams from './pages/admin/Teams'
import TeamBalancingOverview from './components/admin/pages/TeamBalancingOverview'
import Login from './pages/Login'
import NotificationsPage from './pages/NotificationsPage'
import { SlotOffersPage } from './pages/admin/SlotOffersPage';
<<<<<<< HEAD
import { Dashboard } from "./pages/Dashboard"
=======
>>>>>>> parent of 69d0f2c (updates)

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Layout>
          <Routes>
<<<<<<< HEAD
            <Route path="/" element={<Dashboard />} />
=======
>>>>>>> parent of 69d0f2c (updates)
            <Route path="/login" element={<Login />} />
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
            <Route path="/admin/payments" element={<PaymentDashboard />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/admin/ratings" element={<RatingsView />} />
            <Route path="/admin/teams/:gameId" element={<Teams />} />
            <Route path="/admin/team-balancing" element={<TeamBalancingOverview />} />
            <Route path="/admin/slot-offers" element={<SlotOffersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
          <Toaster />
        </Layout>
      </ErrorBoundary>
    </AuthProvider>
  )
}

export default App