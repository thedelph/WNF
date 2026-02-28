import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, CircleOff, Star, CircleDot, DollarSign, PenLine, Armchair, Shield } from 'lucide-react'
import { PlayerCardModifiersProps } from './PlayerCardTypes'
import { Tooltip } from '../ui/Tooltip'
import { useUser } from '../../hooks/useUser'

/**
 * Displays the modifiers section of the player card, including streaks, penalties, and bonuses
 */
export const PlayerCardModifiers: React.FC<PlayerCardModifiersProps> = ({
  playerId,
  currentStreak,
  streakModifier,
  dropoutPenalties,
  dropoutModifier,
  activeBonuses,
  bonusModifier,
  activePenalties,
  penaltyModifier,
  benchWarmerStreak,
  benchWarmerModifier,
  unpaidGames = 0,
  unpaidGamesModifier = 0,
  registrationStreakBonus = 0,
  registrationStreakBonusApplies = false,
  status,
  shieldActive = false,
  protectedStreakValue = null,
  frozenStreakValue = null, // Legacy prop
  // Injury token props
  injuryTokenActive = false,
  injuryOriginalStreak = null,
  injuryReturnStreak = null,
  injuryStreakBonus = null,
}) => {
  const { player } = useUser()
  const [showShieldTooltip, setShowShieldTooltip] = useState(false)

  // Use protectedStreakValue, fall back to legacy frozenStreakValue
  const protectedValue = protectedStreakValue ?? frozenStreakValue ?? null

  // v2 diminishing returns formula for streak bonus
  const calculateStreakBonus = (streak: number): number => {
    if (streak <= 0) return 0;
    if (streak <= 10) {
      return (streak * 11 - (streak * (streak + 1)) / 2) / 100;
    }
    return (55 + (streak - 10)) / 100;
  };

  // Calculate gradual decay values
  const decayingProtectedBonus = shieldActive && protectedValue != null
    ? Math.max(0, protectedValue - currentStreak)
    : null
  const effectiveStreak = shieldActive && protectedValue != null
    ? Math.max(currentStreak, protectedValue - currentStreak)
    : currentStreak

  // Calculate the effective streak bonus percentage using v2 formula
  const effectiveStreakBonus = Math.round(calculateStreakBonus(effectiveStreak) * 100)

  // Calculate convergence progress (converge when natural streak = half protected value)
  const convergencePoint = protectedValue != null ? Math.ceil(protectedValue / 2) : 0
  const gamesToConvergence = shieldActive && protectedValue != null
    ? Math.max(0, convergencePoint - currentStreak)
    : 0
  const convergenceProgress = shieldActive && protectedValue != null && convergencePoint > 0
    ? Math.min(100, (currentStreak / convergencePoint) * 100)
    : 0

  // Shield states:
  // - Pending: natural streak >= protected value (game hasn't been missed yet)
  // - Active/Recovering: natural streak < protected value (protection is decaying)
  // - Recovered: natural streak >= convergence point AND was previously recovering
  const isShieldPending = currentStreak >= (protectedValue ?? 0)
  const isRecovering = !isShieldPending && currentStreak < convergencePoint
  const isConverged = !isShieldPending && currentStreak >= convergencePoint

  // Calculate registration streak bonus modifier (2.5% per streak level)
  const registrationStreakModifier = registrationStreakBonus * 0.025

  // Only show unpaid games if player hasn't dropped out
  const showUnpaidGames = status !== 'dropped_out' && unpaidGames > 0;

  // Determine if this is the current user's card
  const isCurrentUser = player?.id === playerId
  const possessivePronoun = isCurrentUser ? 'Your' : 'Their'

  // Handle click on shield streak bonus (for mobile)
  const handleShieldClick = (e: React.MouseEvent) => {
    if (shieldActive && 'ontouchstart' in window) {
      e.stopPropagation()
      setShowShieldTooltip(!showShieldTooltip)
    }
  }

  return (
    <div className="space-y-2">
      {registrationStreakBonusApplies && registrationStreakBonus > 0 && (
        <Tooltip content={registrationStreakBonus === 1
          ? "Bonus for registering this week"
          : `Bonus for registering ${registrationStreakBonus} weeks in a row`}>
          <motion.div
            className="flex justify-between items-center bg-blue-500/20 rounded-lg p-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              <span className="text-sm">Reg. Streak</span>
            </div>
            <span className="text-sm font-bold">+{(registrationStreakModifier * 100).toFixed(1)}%</span>
          </motion.div>
        </Tooltip>
      )}
      {/* Injury Token Section - Compact amber theme */}
      {injuryTokenActive && (() => {
        // Calculate the return bonus using v2 formula
        const returnStreak = injuryReturnStreak ?? 0;
        const returnBonus = returnStreak <= 0 ? 0
          : returnStreak <= 10
            ? Math.round((returnStreak * 11 - (returnStreak * (returnStreak + 1)) / 2))
            : 55 + (returnStreak - 10);

        return (
          <Tooltip content={`Injured during WNF. Returns at ${returnStreak}-game streak (+${returnBonus}% bonus). Was ${injuryOriginalStreak ?? 0} games.`}>
            <motion.div
              className="flex justify-between items-center rounded-lg p-2 relative overflow-hidden bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-400/40"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <div className="flex items-center gap-2 text-amber-100">
                <span>🩹</span>
                <span className="text-sm font-semibold">Injured</span>
              </div>
              <span className="text-sm font-bold text-amber-200">
                ↩ +{returnBonus}%
              </span>
            </motion.div>
          </Tooltip>
        );
      })()}
      {(currentStreak > 0 || shieldActive) && !injuryTokenActive && (
        <>
          {shieldActive && protectedValue != null ? (
            <Tooltip content={
              isShieldPending
                ? `🛡️ Protection ready! If you miss this game, your ${protectedValue}-game streak bonus will gradually decay instead of resetting to 0.`
                : isConverged
                  ? `🛡️ Fully recovered! Natural streak (${currentStreak}) has caught up. Shield protection complete.`
                  : `🛡️ Recovering from ${protectedValue}-game streak. Effective: ${effectiveStreak} games (+${effectiveStreakBonus}%). ${gamesToConvergence} more ${gamesToConvergence === 1 ? 'game' : 'games'} to full recovery.`
            }>
              <motion.div
                className="rounded-lg p-2 relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-purple-900/40 backdrop-blur-sm border-2 border-purple-400/60 shadow-lg shadow-purple-500/20 cursor-pointer select-none"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={handleShieldClick}
              >
                {/* Frosted glass effect overlay when shield is active */}
                <>
                  {/* Animated shimmer/glow effect */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-400/20 via-indigo-400/10 to-purple-400/20"></div>
                    <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-purple-300/20 rounded-full blur-lg animate-pulse"></div>
                    <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-indigo-300/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </>

                {/* Top row: Shield info and XP bonus */}
                <div className="flex justify-between items-center relative z-10 text-purple-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" fill="currentColor" />
                    <span className="text-sm font-semibold">
                      {effectiveStreak} Game Streak
                    </span>
                  </div>
                  <span className="text-sm font-bold">
                    +{effectiveStreakBonus}%
                  </span>
                </div>

                {/* Status indicator */}
                <div className="mt-2 relative z-10">
                  {isShieldPending ? (
                    // Pending state - shield ready but game hasn't been missed yet
                    <div className="flex items-center justify-center gap-2 text-xs text-purple-200/80 py-1">
                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                      <span>Protection ready</span>
                    </div>
                  ) : (
                    // Recovering or Recovered state - show progress bar
                    <>
                      <div className="flex justify-between text-xs text-purple-200/80 mb-1">
                        <span>{isConverged ? '✓ Recovered' : `${currentStreak}/${convergencePoint} games`}</span>
                        <span>{isConverged ? 'Complete!' : `${gamesToConvergence} to go`}</span>
                      </div>
                      <div className="h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${isConverged ? 'bg-green-400' : 'bg-gradient-to-r from-purple-400 to-indigo-400'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${convergenceProgress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </Tooltip>
          ) : currentStreak > 0 ? (
            !injuryTokenActive && injuryStreakBonus != null && injuryStreakBonus > 0 ? (
              <Tooltip content={`Returned from injury with a ${injuryStreakBonus}-game streak bonus. Natural streak: ${currentStreak - injuryStreakBonus} games.`}>
                <motion.div
                  className="rounded-lg p-2 bg-gradient-to-r from-amber-500/20 to-green-500/20 border border-amber-400/30"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      <span>🩹</span>
                      <span className="text-sm font-semibold">{currentStreak} Game Streak</span>
                    </div>
                    <span className="text-sm font-bold">
                      +{(streakModifier * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-amber-200/80 mt-1 ml-6">
                    Back from injury (+{injuryStreakBonus} bonus)
                  </div>
                </motion.div>
              </Tooltip>
            ) : (
              <motion.div
                className="flex justify-between items-center rounded-lg p-2 bg-green-500/20"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-semibold">{currentStreak} Game Streak</span>
                </div>
                <span className="text-sm font-bold">
                  +{(streakModifier * 100).toFixed(0)}%
                </span>
              </motion.div>
            )
          ) : null}

          {/* Mobile-only expanded tooltip - positioned below the streak bonus */}
          {showShieldTooltip && shieldActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden"
            >
              <div className="bg-purple-900/60 border-2 border-purple-400/40 rounded-lg p-2 text-xs text-purple-100">
                {isShieldPending ? (
                  <span>🛡️ <span className="font-semibold">Protection ready!</span> If you miss this game, your {protectedValue}-game streak bonus will gradually decay instead of resetting to 0.</span>
                ) : isConverged ? (
                  <span>🛡️ <span className="font-semibold">Fully recovered!</span> Natural streak ({currentStreak}) has caught up.</span>
                ) : (
                  <span>🛡️ <span className="font-semibold">Recovering from {protectedValue}-game streak.</span> Effective: {effectiveStreak} games. {gamesToConvergence} more {gamesToConvergence === 1 ? 'game' : 'games'} to full recovery.</span>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
      {dropoutPenalties > 0 && (
        <motion.div 
          className="flex justify-between items-center bg-red-500/20 rounded-lg p-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <CircleOff className="w-4 h-4" />
            <span className="text-sm">Dropout Penalty</span>
          </div>
          <span className="text-sm font-bold text-red-500">-{(dropoutModifier * -100).toFixed(0)}%</span>
        </motion.div>
      )}
      {activeBonuses > 0 && (
        <motion.div 
          className="flex justify-between items-center bg-green-500/20 rounded-lg p-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span className="text-sm">Active Bonuses</span>
          </div>
          <span className="text-sm font-bold">+{(bonusModifier * 100).toFixed(0)}%</span>
        </motion.div>
      )}
      {activePenalties > 0 && (
        <motion.div 
          className="flex justify-between items-center bg-red-500/20 rounded-lg p-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <CircleOff className="w-4 h-4" />
            <span className="text-sm">Active Penalties</span>
          </div>
          <span className="text-sm font-bold">{(penaltyModifier * 100).toFixed(0)}%</span>
        </motion.div>
      )}
      {benchWarmerStreak > 0 && (
        <Tooltip content={`${benchWarmerStreak} ${benchWarmerStreak === 1 ? 'game' : 'games'} as reserve`}>
          <motion.div 
            className="flex justify-between items-center bg-yellow-500/20 rounded-lg p-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4" />
              <span className="text-sm">Bench Warmer</span>
            </div>
            <span className="text-sm font-bold">{benchWarmerModifier > 0 ? '+' : ''}{(benchWarmerModifier * 100).toFixed(1)}%</span>
          </motion.div>
        </Tooltip>
      )}
      {showUnpaidGames && (
        <motion.div 
          className="flex justify-between items-center bg-red-500/20 rounded-lg p-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Unpaid Games</span>
          </div>
          <span className="text-sm font-bold text-red-500">{(unpaidGamesModifier * 100).toFixed(0)}%</span>
        </motion.div>
      )}
    </div>
  )
}
