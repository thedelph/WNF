export interface PlayerStats {
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
  dropoutPenalties: number;
  gameSequences?: string[]; // Array of game sequence numbers, ordered by most recent first
}

/**
 * Calculates weighted XP based on game recency
 * Most recent games are worth more points:
 * - Last game: 20 points
 * - Games 2-3: 18 points
 * - Games 4-5: 16 points
 * - Games 6-10: 14 points
 * - Games 11-20: 12 points
 * - Games 20+: 10 points
 */
const calculateWeightedBaseXP = (gameSequences: number[] = [], caps: number): number => {
  // If no game sequences but has caps, create a sequence based on caps
  if (gameSequences.length === 0 && caps > 0) {
    gameSequences = Array.from({ length: caps }, (_, i) => i + 1);
  }

  return gameSequences.reduce((total, _, index) => {
    if (index === 0) return total + 20; // Last game
    if (index < 3) return total + 18;   // Games 2-3
    if (index < 5) return total + 16;   // Games 4-5
    if (index < 10) return total + 14;  // Games 6-10
    if (index < 20) return total + 12;  // Games 11-20
    return total + 10;                  // Games 20+
  }, 0);
};

export const calculatePlayerXP = ({
  caps = 0,
  activeBonuses = 0,
  activePenalties = 0,
  currentStreak = 0,
  dropoutPenalties = 0,
  gameSequences = []
}: PlayerStats): number => {
  // Calculate base XP using weighted game points
  const baseXP = calculateWeightedBaseXP(
    gameSequences.map(seq => parseInt(seq)),
    caps
  );
  
  // Calculate streak multiplier (10% bonus per streak level)
  const streakMultiplier = 1 + (currentStreak * 0.1);
  
  // Apply bonuses and penalties
  const bonusXP = activeBonuses * 100;
  const penaltyXP = activePenalties * 100;
  const dropoutXP = dropoutPenalties * 50;
  
  // Calculate final XP with streak multiplier
  const totalXP = (baseXP * streakMultiplier) + bonusXP - penaltyXP - dropoutXP;
  
  // Ensure XP doesn't go below 0 and round
  return Math.max(0, Math.round(totalXP));
};
