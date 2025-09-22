import React, { useState } from 'react'
import { useAdmin } from '../../hooks/useAdmin'
import { useViewAs } from '../../context/ViewAsContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GameManagementCard from '../../components/admin/cards/GameManagementCard'
import PlayerManagementCard from '../../components/admin/cards/PlayerManagementCard'
import TeamGenerationCard from '../../components/admin/cards/TeamGenerationCard'
import PaymentManagementCard from '../../components/admin/cards/PaymentManagementCard'
import AdminManagementCard from '../../components/admin/cards/AdminManagementCard'
import HistoricalDataCard from '../../components/admin/cards/HistoricalDataCard'
import RatingsCard from '../../components/admin/cards/RatingsCard'
import { SlotOffersCard } from '../../components/admin/cards/SlotOffersCard'
import { TokenManagementCard } from '../../components/admin/cards/TokenManagementCard'
import AccountManagementCard from '../../components/admin/cards/AccountManagementCard'
import RoleManagementCard from '../../components/admin/cards/RoleManagementCard'
import FeatureFlagManagementCard from '../../components/admin/cards/FeatureFlagManagementCard'
import { PERMISSIONS } from '../../types/permissions'
import ViewAsUserSelector from '../../components/admin/ViewAsUserSelector'

const AdminPortal: React.FC = () => {
  const { isAdmin, isSuperAdmin, hasPermission, loading: adminLoading } = useAdmin()
  const { setViewAsUser, isViewingAs } = useViewAs()
  const navigate = useNavigate()
  const [showViewAsModal, setShowViewAsModal] = useState(false)

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>
  }

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>
  }

  const handleViewAsUser = (user: any) => {
    // Transform the user data to match the ViewAsUser interface
    const permissions = user.admin_role?.role?.role_permissions?.map((rp: any) => rp.permission) || []
    const customPermissions = user.admin_role?.admin_permissions?.map((ap: any) => ap.permission) || []
    const allPermissions = [...new Set([...permissions, ...customPermissions])]

    setViewAsUser({
      id: user.id,
      user_id: user.user_id,
      friendly_name: user.friendly_name,
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin,
      is_beta_tester: user.is_beta_tester,
      permissions: allPermissions,
      roleName: user.admin_role?.role?.name
    })

    setShowViewAsModal(false)
    // Navigate to home to see the app from the user's perspective
    navigate('/')
  }

  return (
    <>
      <div className="container mx-auto mt-8 p-4">
        <div className="flex justify-between items-center mb-6">
          <motion.h1
            className="text-3xl font-bold"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Admin Portal
          </motion.h1>

          {/* View As Any User button - only for super admins when not already viewing as */}
          {isSuperAdmin && !isViewingAs && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowViewAsModal(true)}
              className="btn btn-primary btn-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View As Any User
            </motion.button>
          )}
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          hasPermission(PERMISSIONS.MANAGE_GAMES) && <GameManagementCard key="game" />,
          hasPermission(PERMISSIONS.MANAGE_PLAYERS) && <PlayerManagementCard key="player" />,
          hasPermission(PERMISSIONS.MANAGE_TEAMS) && <TeamGenerationCard key="team" />,
          hasPermission(PERMISSIONS.MANAGE_PAYMENTS) && <PaymentManagementCard key="payment" />,
          hasPermission(PERMISSIONS.MANAGE_TOKENS) && <TokenManagementCard key="token" />,
          hasPermission(PERMISSIONS.MANAGE_ACCOUNTS) && <AccountManagementCard key="account" />,
          hasPermission(PERMISSIONS.MANAGE_ADMINS) && <AdminManagementCard key="admin" />,
          hasPermission(PERMISSIONS.MANAGE_HISTORY) && <HistoricalDataCard key="historical" />,
          hasPermission(PERMISSIONS.MANAGE_SLOTS) && <SlotOffersCard key="slots" />,
          hasPermission(PERMISSIONS.MANAGE_RATINGS) && <RatingsCard key="ratings" />,
          isSuperAdmin && <RoleManagementCard key="roles" />,
          isSuperAdmin && <FeatureFlagManagementCard key="feature-flags" />
        ].filter(Boolean).map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05,
              ease: "easeOut"
            }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            className="h-full"
          >
            {card}
          </motion.div>
        ))}
      </div>
    </div>

    {/* View As User Modal */}
    {showViewAsModal && (
      <ViewAsUserSelector
        onSelectUser={handleViewAsUser}
        onCancel={() => setShowViewAsModal(false)}
      />
    )}
    </>
  )
}

export default AdminPortal
