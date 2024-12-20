import { PlayerXPStats } from '../types/player'

/**
 * Calculates the player's XP based on various stats
 * @param stats Player's stats used for XP calculation
 * @returns Total XP value
 */
export const calculatePlayerXP = (stats: PlayerXPStats): number => {
  if (!stats) return 0

  const {
    caps,
    activeBonuses,
    activePenalties,
    currentStreak,
    dropoutPenalties
  } = stats

  // Base XP from caps
  const capsXP = caps * 100

  // Bonus XP from active bonuses
  const bonusXP = activeBonuses * 50

  // Penalty XP from active penalties
  const penaltyXP = activePenalties * -50

  // Streak bonus
  const streakXP = currentStreak * 25

  // Dropout penalties
  const dropoutXP = dropoutPenalties * -100

  // Calculate total XP
  const totalXP = capsXP + bonusXP + penaltyXP + streakXP + dropoutXP

  // Ensure XP doesn't go below 0
  return Math.max(0, totalXP)
}
