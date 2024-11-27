export const calculatePlayerXP = (player: any): number => {
  if (!player) return 0;
  
  const baseXP = player.caps || 0;
  const bonuses = player.active_bonuses || player.activeBonuses || 0;
  const penalties = player.active_penalties || player.activePenalties || 0;
  const streak = player.current_streak || player.currentStreak || 0;
  
  const bonusModifier = bonuses * 0.1;
  const penaltyModifier = penalties * -0.1;
  const streakModifier = streak * 0.1;
  
  const xp = baseXP * (1 + bonusModifier + penaltyModifier + streakModifier);
  return Math.round(xp * 10) / 10; // Round to 1 decimal place
};