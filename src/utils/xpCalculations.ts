export interface PlayerStats {
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
}

export const calculatePlayerXP = ({
  caps = 0,
  active_bonuses = 0,
  active_penalties = 0,
  current_streak = 0
}: PlayerStats): number => {
  const baseXP = caps * 100;
  const bonusXP = active_bonuses * 50;
  const penaltyXP = active_penalties * -50;
  const streakXP = current_streak * 25;

  return baseXP + bonusXP + penaltyXP + streakXP;
};

export const selectPlayers = async (
  gameId: string,
  registrations: PlayerStats[],
  maxPlayers: number = 18
): Promise<string[]> => {
  // Sort players by XP in descending order
  const sortedPlayers = [...registrations].sort((a, b) => {
    const xpA = calculatePlayerXP(a);
    const xpB = calculatePlayerXP(b);
    return xpB - xpA;
  });

  // Select top players up to maxPlayers
  const selectedPlayers = sortedPlayers.slice(0, maxPlayers);

  // Return selected player IDs
  return selectedPlayers.map(p => p.id);
};
