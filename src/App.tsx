import React, { Suspense } from "react"
import { Routes, Route, Outlet, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Analytics } from '@vercel/analytics/react'
import Layout from "./components/Layout"
import StandaloneLayout from "./components/layout/StandaloneLayout"
import { AuthProvider } from "./context/AuthContext"
import { ViewAsProvider } from "./context/ViewAsContext"
import { ThemeProvider } from "./context/ThemeContext"
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { ScrollToTop } from './components/ui/ScrollToTop'

// ── Eagerly loaded routes (core user-facing pages) ──────────────────────
import Leaderboards from './pages/Leaderboards'
import Login from './pages/Login'
import Register from './pages/Register'
import Game from "./pages/Game"

// ── Lazy loaded routes ──────────────────────────────────────────────────
// Auth pages (rarely revisited after login)
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'))
const EmailVerification = React.lazy(() => import('./pages/EmailVerification'))

// Player-facing pages
const Profile = React.lazy(() => import("./pages/Profile"))
const PlayerList = React.lazy(() => import('./pages/PlayerList'))
const PlayerProfile = React.lazy(() => import('./pages/PlayerProfile'))
const Ratings = React.lazy(() => import('./pages/Ratings'))
const Results = React.lazy(() => import('./pages/Results'))
const GameDetail = React.lazy(() => import('./pages/GameDetail'))
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'))
const Changelog = React.lazy(() => import('./pages/Changelog'))
const StandaloneStats = React.lazy(() => import('./pages/StandaloneStats'))

// Misc pages
const WhatsAppBotHelp = React.lazy(() => import('./pages/WhatsAppBotHelp'))
const WeatherDemo = React.lazy(() => import('./pages/WeatherDemo'))
const DesignPreview = React.lazy(() => import('./pages/DesignPreview'))

// Admin pages (only loaded for admin users)
const AdminPortal = React.lazy(() => import("./pages/admin/AdminPortal"))
const AdminManagement = React.lazy(() => import("./pages/admin/admins"))
const AdminPermissions = React.lazy(() => import("./pages/admin/permissions"))
const GameManagement = React.lazy(() => import("./pages/admin/games"))
const Players = React.lazy(() => import("./pages/admin/players"))
const EditPlayer = React.lazy(() => import("./pages/admin/EditPlayer"))
const HistoricalGames = React.lazy(() => import('./pages/admin/history/HistoricalGames'))
const PaymentDashboard = React.lazy(() => import('./components/admin/payments/PaymentDashboard'))
const RatingsView = React.lazy(() => import('./pages/admin/ratings'))
const Teams = React.lazy(() => import('./pages/admin/Teams'))
const TeamBalancingOverview = React.lazy(() => import('./components/admin/pages/TeamBalancingOverview'))
const SlotOffersPage = React.lazy(() => import('./pages/admin/SlotOffersPage').then(m => ({ default: m.SlotOffersPage })))
const TokenManagement = React.lazy(() => import('./pages/admin/TokenManagement'))
const AccountManagement = React.lazy(() => import('./pages/admin/AccountManagement'))
const RoleManagement = React.lazy(() => import('./pages/admin/RoleManagement'))
const FeatureFlagManagement = React.lazy(() => import('./pages/admin/FeatureFlagManagement'))
const TeamBalancingVisualization = React.lazy(() => import('./pages/admin/TeamBalancingVisualization'))
const SessionDiagnostics = React.lazy(() => import('./pages/admin/SessionDiagnostics'))
const ShieldTokenManagement = React.lazy(() => import('./pages/admin/ShieldTokenManagement'))
const InjuryTokenManagement = React.lazy(() => import('./pages/admin/InjuryTokenManagement'))
const XPComparison = React.lazy(() => import('./pages/admin/XPComparison'))

// ── Loading fallback ────────────────────────────────────────────────────
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="loading loading-spinner loading-lg text-primary" />
  </div>
)

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false
    },
  },
})

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ViewAsProvider>
            <ErrorBoundary>
            <ScrollToTop />
            <Suspense fallback={<RouteLoader />}>
            <Routes>
            {/* Redirect root to leaderboards */}
            <Route path="/" element={<Navigate to="/leaderboards" replace />} />

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
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/stats" element={<Navigate to="/leaderboards" replace />} />
                <Route path="/awards" element={<Navigate to="/leaderboards" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="/admin/admins" element={<AdminManagement />} />
                <Route path="/admin/permissions" element={<AdminPermissions />} />
                <Route path="/admin/roles" element={<RoleManagement />} />
                <Route path="/admin/feature-flags" element={<FeatureFlagManagement />} />
                <Route path="/admin/games" element={<GameManagement />} />
                <Route path="/admin/players" element={<Players />} />
                <Route path="/admin/players/:id" element={<EditPlayer />} />
                <Route path="/games" element={<Game />} />
                <Route path="/results" element={<Results />} />
                <Route path="/results/:sequenceNumber" element={<GameDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/history" element={<HistoricalGames />} />
                <Route path="/players" element={<PlayerList />} />
                <Route path="/players/:id" element={<PlayerProfile />} />
                <Route path="/player/:friendlyName" element={<PlayerProfile />} />
                <Route path="/admin/payments" element={<PaymentDashboard />} />
                <Route path="/ratings" element={<Ratings />} />
                <Route path="/admin/ratings" element={<RatingsView />} />
                <Route path="/admin/teams/:gameId" element={<Teams />} />
                <Route path="/admin/team-balancing" element={<TeamBalancingOverview />} />
                <Route path="/admin/team-balancing/visualization" element={<TeamBalancingVisualization />} />
                <Route path="/admin/slot-offers" element={<SlotOffersPage />} />
                <Route path="/admin/tokens" element={<TokenManagement />} />
                <Route path="/admin/shields" element={<ShieldTokenManagement />} />
                <Route path="/admin/injuries" element={<InjuryTokenManagement />} />
                <Route path="/admin/account-management" element={<AccountManagement />} />
                <Route path="/admin/session-diagnostics" element={<SessionDiagnostics />} />
                <Route path="/admin/xp-comparison" element={<XPComparison />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/help/whatsapp-bot" element={<WhatsAppBotHelp />} />
                <Route path="/weather-demo" element={<WeatherDemo />} />
                <Route path="/design-preview" element={<DesignPreview />} />
              </Route>
            </Routes>
            </Suspense>
            <Toaster />
            </ErrorBoundary>
          </ViewAsProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      {/* Vercel Analytics - Tracks page views and other metrics */}
      <Analytics />
    </QueryClientProvider>
  )
}

export default App
