/**
 * Rarity tiers and their percentile thresholds (for reference only, actual calculation done in database)
 */
export const RARITY_THRESHOLDS = {
  LEGENDARY: 0.98,    // Top 2% (98th percentile)
  WORLD_CLASS: 0.93,  // Top 7% (93rd percentile)
  PROFESSIONAL: 0.80, // Top 20% (80th percentile)
  SEMI_PRO: 0.60     // Top 40% (60th percentile)
} as const;

export type RarityTier = 'Legendary' | 'World Class' | 'Professional' | 'Semi Pro' | 'Amateur';

/**
 * Get the rarity tier from the database value
 * @param rarity - The rarity string from the database
 * @returns The player's rarity tier
 */
export const getRarity = (rarity: string | null): RarityTier => {
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
export const calculateRarity = (xp: number, allXp: number[]): RarityTier => {
  console.warn('calculateRarity is deprecated. Rarity is now calculated in the database.');
  return 'Amateur'; // Default to Amateur if database value not available
};

/**
 * Calculate a player's XP based on their stats
 */
export const calculatePlayerXP = ({
  caps = 0,
  activeBonuses = 0,
  activePenalties = 0,
  currentStreak = 0
}: PlayerStats): number => {
  const bonusModifier = activeBonuses * 0.1;
  const penaltyModifier = activePenalties * 0.1;
  const streakModifier = currentStreak * 0.1;
  
  const totalModifier = 1 + bonusModifier - penaltyModifier + streakModifier;
  
  return Math.round(caps * totalModifier);
};
