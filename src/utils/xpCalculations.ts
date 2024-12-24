export interface PlayerStats {
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
  dropoutPenalties: number;
}

export const calculatePlayerXP = ({
  caps = 0,
  activeBonuses = 0,
  activePenalties = 0,
  currentStreak = 0,
  dropoutPenalties = 0
}: PlayerStats): number => {
  const bonusModifier = activeBonuses * 1;
  const penaltyModifier = activePenalties * 1;
  const streakModifier = currentStreak * 1;
  const dropoutModifier = dropoutPenalties * 5; // Each dropout reduces XP by 50%
  
  const baseModifier = 10 + bonusModifier - penaltyModifier + streakModifier;
  const penalizedModifier = Math.max(baseModifier - dropoutModifier, 1); // Ensure modifier doesn't go below 1
  
  return Math.round(caps * penalizedModifier);
};
