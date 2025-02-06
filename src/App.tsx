import React from "react"
import { Routes, Route, Outlet, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Layout from "./components/Layout"
import StandaloneLayout from "./components/layout/StandaloneLayout"
import AdminPortal from "./pages/admin/AdminPortal"
import AdminManagement from "./pages/admin/admins"
import AdminPermissions from "./pages/admin/permissions"
import GameManagement from "./pages/admin/games"
import Game from "./pages/Game"
import Profile from "./pages/Profile"
import Players from "./pages/admin/players"
import EditPlayer from "./pages/admin/EditPlayer"
import { AuthProvider } from "./context/AuthContext"
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
import Register from './pages/Register'
import NotificationsPage from './pages/NotificationsPage'
import { SlotOffersPage } from './pages/admin/SlotOffersPage'
import EmailVerification from './pages/EmailVerification'
import Changelog from './pages/Changelog'
import Stats from './pages/Stats'
import StandaloneStats from './pages/StandaloneStats'
import { ScrollToTop } from './components/ui/ScrollToTop'
import TokenManagement from './pages/admin/TokenManagement'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false
    },
  },
})

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <Routes>
            {/* Redirect root to stats */}
            <Route path="/" element={<Navigate to="/stats" replace />} />
            
            {/* Standalone Stats Route */}
              <Route 
                path="/standalone-stats" 
                element={
                  <StandaloneLayout>
                    <StandaloneStats />
                  </StandaloneLayout>
                } 
              />
              
              {/* Regular Layout Routes */}
              <Route element={
                <Layout>
                  <Outlet />
                </Layout>
              }>
                <Route path="/stats" element={<Stats />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<EmailVerification />} />
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
                <Route path="/admin/tokens" element={<TokenManagement />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/changelog" element={<Changelog />} />
              </Route>
            </Routes>
            <Toaster />
        </ErrorBoundary>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App