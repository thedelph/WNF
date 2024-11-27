export interface PlayerStats {
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
}

export const calculatePlayerXP = ({
  caps = 0,
  activeBonuses = 0,
  activePenalties = 0,
  currentStreak = 0
}: PlayerStats): number => {
  const bonusModifier = activeBonuses * 0.1;
  const penaltyModifier = activePenalties * 0.1;
  const streakModifier = currentStreak * 0.1;
  
  const totalModifier = 10 + bonusModifier - penaltyModifier + streakModifier;
  
  return Math.round(caps * totalModifier);
};
