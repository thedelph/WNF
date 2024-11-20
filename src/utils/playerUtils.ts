export const calculatePlayerXP = (player: any): number => {
  if (!player) return 0;
  
  const baseXP = player.caps || 0;
  const bonusModifier = (player.active_bonuses || 0) * 0.1;
  const penaltyModifier = (player.active_penalties || 0) * -0.1;
  const streakModifier = (player.current_streak || 0) * 0.1;
  
  return baseXP * (1 + bonusModifier + penaltyModifier + streakModifier);
}; 