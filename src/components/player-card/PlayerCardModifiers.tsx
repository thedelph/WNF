import React from 'react'
import { motion } from 'framer-motion'
import { Flame, CircleOff, Star, CircleDot, DollarSign, PenLine, Armchair } from 'lucide-react'
import { PlayerCardModifiersProps } from './PlayerCardTypes'
import { Tooltip } from '../ui/Tooltip'

/**
 * Displays the modifiers section of the player card, including streaks, penalties, and bonuses
 */
export const PlayerCardModifiers: React.FC<PlayerCardModifiersProps> = ({
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
}) => {
  // Calculate registration streak bonus modifier (2.5% per streak level)
  const registrationStreakModifier = registrationStreakBonus * 0.025

  // Only show unpaid games if player hasn't dropped out
  const showUnpaidGames = status !== 'dropped_out' && unpaidGames > 0;

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
        <motion.div 
          className="flex justify-between items-center bg-green-500/20 rounded-lg p-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" />
            <span className="text-sm">Streak Bonus</span>
          </div>
          <span className="text-sm font-bold">+{(streakModifier * 100).toFixed(0)}%</span>
        </motion.div>
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
          <span className="text-sm font-bold text-red-500">-{(unpaidGamesModifier * -100).toFixed(0)}%</span>
        </motion.div>
      )}
    </div>
  )
}
