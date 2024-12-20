import type { PlayerStats } from '../types/player'

export const calculatePlayerXP = (stats: PlayerStats): number => {
  let xp = 0

  // Base XP from games played
  xp += stats.caps * 100

  // Bonus XP from win rate
  if (stats.winRate) {
    xp += Math.floor(stats.winRate * 10)
  }

  // Bonus XP from streaks
  if (stats.currentStreak) {
    xp += stats.currentStreak * 50
  }
  if (stats.maxStreak) {
    xp += stats.maxStreak * 100
  }

  // Bonus XP from active bonuses
  if (stats.activeBonuses) {
    xp += stats.activeBonuses * 200
  }

  // Penalty XP from active penalties
  if (stats.activePenalties) {
    xp -= stats.activePenalties * 100
  }

  // Penalty XP from dropout penalties
  if (stats.dropoutPenalties) {
    xp -= stats.dropoutPenalties * 150
  }

  return Math.max(0, xp) // Ensure XP never goes below 0
}

export const calculateRarity = (xp: number): 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' => {
  if (xp >= 10000) return 'Legendary'
  if (xp >= 5000) return 'Epic'
  if (xp >= 2500) return 'Rare'
  if (xp >= 1000) return 'Uncommon'
  return 'Common'
}
