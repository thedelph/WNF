import React from 'react'
import { useAdmin } from '../../hooks/useAdmin'
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
import ViewAsIndicator from '../../components/admin/ViewAsIndicator'

const AdminPortal: React.FC = () => {
  const { isAdmin, isSuperAdmin, hasPermission, loading: adminLoading } = useAdmin()

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>
  }

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>
  }

  return (
    <>
      <ViewAsIndicator />
      <div className="container mx-auto mt-8 p-4">
        <motion.h1 
          className="text-3xl font-bold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Admin Portal
        </motion.h1>
      
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
    </>
  )
}

export default AdminPortal
