export const calculateRarity = (xp: number, allXp: number[]): 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common' => {
  const sortedXP = [...allXp].sort((a, b) => b - a);
  const position = sortedXP.indexOf(xp);
  const totalPlayers = allXp.length;
  
  const thresholds = {
    legendary: Math.max(1, Math.ceil(totalPlayers * 0.02)),  // Top 2%
    epic: Math.max(2, Math.ceil(totalPlayers * 0.07)),       // Top 7%
    rare: Math.max(4, Math.ceil(totalPlayers * 0.20)),       // Top 20%
    uncommon: Math.max(8, Math.ceil(totalPlayers * 0.40))    // Top 40%
  };

  if (position < thresholds.legendary) return 'Legendary';
  if (position < thresholds.epic) return 'Epic';
  if (position < thresholds.rare) return 'Rare';
  if (position < thresholds.uncommon) return 'Uncommon';
  return 'Common';
};

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
