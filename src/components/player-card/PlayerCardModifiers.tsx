import React from 'react'
import { motion } from 'framer-motion'
import { Flame, CircleOff, Star, CircleDot } from 'lucide-react'
import { PlayerCardModifiersProps } from './PlayerCardTypes'

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
}) => {
  return (
    <div className="space-y-2">
      {currentStreak > 1 && (
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
        <motion.div 
          className="flex justify-between items-center bg-purple-500/20 rounded-lg p-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4" />
            <span className="text-sm">Bench Warmer Bonus</span>
          </div>
          <span className="text-sm font-bold">+{(benchWarmerModifier * 100).toFixed(0)}%</span>
        </motion.div>
      )}
    </div>
  )
}
