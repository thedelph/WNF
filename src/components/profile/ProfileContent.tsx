import { motion } from 'framer-motion'
import StatsGrid from './StatsGrid'
import XPBreakdown from './XPBreakdown'
import TokenStatus from './TokenStatus'
import ShieldTokenStatus from './ShieldTokenStatus'
import PaymentHistory from './PaymentHistory'
import WhatsAppSettings from './WhatsAppSettings'
// Import types from the root src directory
import type { ExtendedPlayerData } from 'src/types/profile'
import type { TokenStatus as TokenStatusType } from 'src/hooks/useTokenStatus'
import type { ShieldStatus } from 'src/hooks/useShieldStatus'

interface ProfileContentProps {
  profile: ExtendedPlayerData | null
  tokenStatus: TokenStatusType | null
  shieldStatus: ShieldStatus | null
  shieldLoading: boolean
  onProfileUpdate?: () => void
}

export default function ProfileContent({
  profile,
  tokenStatus,
  shieldStatus,
  shieldLoading,
  onProfileUpdate
}: ProfileContentProps) {
  if (!profile) return null

  console.log('[ProfileContent] Profile data:', {
    registrationStreak: profile.registrationStreak,
    registrationStreakApplies: profile.registrationStreakApplies,
    fullProfile: profile
  })

  return (
    <>
      {/* Stats Grid Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-base-200 rounded-box p-6 shadow-lg"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Player Stats</h2>
        <StatsGrid 
          stats={{
            id: profile.id,
            friendly_name: profile.friendly_name,
            xp: profile.xp,
            total_xp: profile.total_xp,
            highest_xp: profile.highestXP,
            highest_xp_v2: profile.highestXPv2,
            highest_xp_date: profile.highestXPSnapshotDate,
            is_highest_xp_v1_era: profile.isHighestXPV1Era,
            current_streak: profile.current_streak,
            max_streak: profile.max_streak,
            max_streak_date: profile.maxStreakDate,
            rarity: profile.rarity,
            win_rate: profile.win_rate,
            recent_win_rate: profile.recent_win_rate,
            caps: profile.caps,
            active_bonuses: 0,
            active_penalties: 0
          }} 
        />
      </motion.div>

      {/* XP Breakdown Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-base-200 rounded-box p-6 shadow-lg"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">XP Breakdown</h2>
        <XPBreakdown stats={{
          caps: profile.caps || 0,
          activeBonuses: 0,
          activePenalties: 0,
          currentStreak: profile.current_streak || 0,
          gameHistory: profile.gameSequences?.map((reg: any) => ({
            sequence: reg.sequence,
            status: reg.status,
            unpaid: false
          })) || [],
          latestSequence: profile.latestSequence || 0,
          xp: profile.xp || 0,
          reserveXP: profile.reserveXP || 0,
          reserveCount: profile.reserve_games || 0,
          benchWarmerStreak: profile.bench_warmer_streak || 0,
          registrationStreak: profile.registrationStreak || 0,
          registrationStreakApplies: profile.registrationStreakApplies || false,
          unpaidGames: profile.unpaidGames || 0
        }} />
      </motion.div>

      {/* Token Status Section */}
      {tokenStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-base-200 rounded-box p-6 shadow-lg"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Token Status</h2>
          <TokenStatus
            status={tokenStatus.status}
            lastUsedAt={tokenStatus.lastUsedAt}
            createdAt={tokenStatus.createdAt}
            isEligible={tokenStatus.isEligible}
            recentGames={tokenStatus.recentGames}
            hasPlayedInLastTenGames={tokenStatus.hasPlayedInLastTenGames}
            hasRecentSelection={tokenStatus.hasRecentSelection}
            hasOutstandingPayments={tokenStatus.hasOutstandingPayments}
            outstandingPaymentsCount={tokenStatus.outstandingPaymentsCount}
            whatsappGroupMember={tokenStatus.whatsappGroupMember}
          />
        </motion.div>
      )}

      {/* Shield Token Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-base-200 rounded-box p-6 shadow-lg"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Shield Token Status</h2>
        {shieldStatus ? (
          <ShieldTokenStatus
            tokensAvailable={shieldStatus.tokensAvailable}
            gamesTowardNextToken={shieldStatus.gamesTowardNextToken}
            gamesUntilNextToken={shieldStatus.gamesUntilNextToken}
            shieldActive={shieldStatus.shieldActive}
            protectedStreakValue={shieldStatus.protectedStreakValue}
            currentStreak={shieldStatus.currentStreak}
            isLoading={shieldLoading}
          />
        ) : (
          <ShieldTokenStatus
            tokensAvailable={0}
            gamesTowardNextToken={0}
            gamesUntilNextToken={10}
            shieldActive={false}
            protectedStreakValue={null}
            isLoading={shieldLoading}
          />
        )}
      </motion.div>

      {/* Payment History Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-base-200 rounded-box p-6 shadow-lg"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Payment History</h2>
        <PaymentHistory />
      </motion.div>

      {/* WhatsApp Settings Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-base-200 rounded-box p-6 shadow-lg"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4">WhatsApp Bot Integration</h2>
        <WhatsAppSettings
          playerId={profile.id}
          currentNumber={profile.whatsapp_mobile_number}
          whatsappGroupMember={profile.whatsapp_group_member}
          onUpdate={onProfileUpdate}
        />
      </motion.div>
    </>
  )
}
