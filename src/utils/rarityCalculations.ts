import { PlayerStats } from '../types/player';

/**
 * Rarity tiers and their percentile thresholds (for reference only, actual calculation done in database)
 * All these tiers only apply to players with XP > 0
 */
export const RARITY_THRESHOLDS = {
  LEGENDARY: 0.98,    // Top 2% (98th percentile)
  WORLD_CLASS: 0.93,  // Top 7% (93rd percentile)
  PROFESSIONAL: 0.80, // Top 20% (80th percentile)
  SEMI_PRO: 0.60,     // Top 40% (60th percentile)
  AMATEUR: 0.00       // All players with XP > 0
} as const;

export type RarityTier = 'Legendary' | 'World Class' | 'Professional' | 'Semi Pro' | 'Amateur' | 'Retired';

/**
 * Get the rarity tier from the database value
 * @param rarity - The rarity string from the database
 * @param xp - The player's XP value (optional)
 * @returns The player's rarity tier
 */
export const getRarity = (rarity: string | null, xp?: number | null): RarityTier => {
  // Special case for players with 0 XP - they get the 'Retired' tier
  if (xp === 0) return 'Retired';
  
  // If no rarity provided or null/undefined, default to Amateur
  if (!rarity) return 'Amateur';
  
  return rarity as RarityTier;
};

/**
 * Calculate the rarity tier of a player based on their XP relative to all players
 * @param xp - The player's XP value
 * @param allXp - Array of all player XP values
 * @returns The player's rarity tier
 * @deprecated Use getRarity() instead as rarity is now calculated in the database
 */
export const calculateRarity = (_xp: number, _allXp: number[]): RarityTier => {
  console.warn('calculateRarity is deprecated. Rarity is now calculated in the database.');
  
  // Special case for players with 0 XP
  if (_xp === 0) return 'Retired';
  
  return 'Amateur'; // Default to Amateur if database value not available
};

/**
 * Calculate a player's XP based on their stats
 */
export const calculatePlayerXP = ({
  caps = 0,
  active_bonuses = 0,
  active_penalties = 0,
  current_streak = 0
}: PlayerStats): number => {
  const bonusModifier = active_bonuses * 0.1;
  const penaltyModifier = active_penalties * 0.1;
  const streakModifier = current_streak * 0.1;
  
  const totalModifier = 1 + bonusModifier - penaltyModifier + streakModifier;
  
  return Math.round(caps * totalModifier);
};
