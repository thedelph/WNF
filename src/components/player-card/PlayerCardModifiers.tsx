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
  frozenStreakValue = null,
}) => {
  const { player } = useUser()
  const [showShieldTooltip, setShowShieldTooltip] = useState(false)

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
      {currentStreak > 0 && (
        <>
          {shieldActive ? (
            <Tooltip content={`🛡️ Streak Protection Active: ${possessivePronoun} ${frozenStreakValue}-game streak is frozen at +${(frozenStreakValue * 10).toFixed(0)}% XP for this week`}>
              <motion.div
                className="flex justify-between items-center rounded-lg p-2 relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-purple-900/40 backdrop-blur-sm border-2 border-purple-400/60 shadow-lg shadow-purple-500/20 cursor-pointer select-none"
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

                <div className="flex items-center gap-2 relative z-10 text-purple-100">
                  <Shield className="w-4 h-4" fill="currentColor" />
                  <span className="text-sm font-semibold">Streak Frozen</span>
                </div>
                <span className="text-sm font-bold relative z-10 text-purple-100">
                  +{frozenStreakValue ? (frozenStreakValue * 10).toFixed(0) : (streakModifier * 100).toFixed(0)}%
                </span>
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
                <span className="text-sm font-semibold">Streak Bonus</span>
              </div>
              <span className="text-sm font-bold">
                +{(streakModifier * 100).toFixed(0)}%
              </span>
            </motion.div>
          )}

          {/* Mobile-only expanded tooltip - positioned below the streak bonus */}
          {showShieldTooltip && shieldActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden"
            >
              <div className="bg-purple-900/60 border-2 border-purple-400/40 rounded-lg p-2 text-xs text-purple-100">
                <span className="font-semibold">🛡️ Streak Protection Active:</span> {possessivePronoun} {frozenStreakValue}-game streak is frozen at +{(frozenStreakValue * 10).toFixed(0)}% XP for this week
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
