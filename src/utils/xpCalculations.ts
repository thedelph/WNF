export interface PlayerStats {
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
  dropoutPenalties: number;
  gameSequences?: number[]; // Array of game sequence numbers, ordered by most recent first
  latestSequence?: number;  // The most recent game sequence number
}

/**
 * Calculates weighted XP based on game recency and participation
 * Points are awarded based on how many games ago from the latest game:
 * - Last game (0 games ago): 20 points
 * - Games 2-3 ago: 18 points
 * - Games 4-5 ago: 16 points
 * - Games 6-10 ago: 14 points
 * - Games 11-20 ago: 12 points
 * - Games 20+ ago: 10 points
 * 
 * @param gameSequences Array of game sequence numbers where player participated
 * @param caps Total number of games played by player
 * @param latestSequence The most recent historical game sequence number
 */
const calculateWeightedBaseXP = (
  gameSequences: number[] = [], 
  caps: number,
  latestSequence: number
): number => {
  // Sort sequences in descending order and filter out null/undefined/NaN and future games
  const sortedSequences = [...gameSequences]
    .filter(seq => 
      seq != null && 
      !isNaN(seq) && 
      seq <= latestSequence // Only include games up to the latest sequence
    )
    .map(Number)
    .sort((a, b) => b - a);

  // Group sequences by category
  const gameCategories = {
    current: 0,
    recent: 0,
    newer: 0,
    mid: 0,
    older: 0,
    oldest: 0
  };

  // Count games in each category
  sortedSequences.forEach(sequence => {
    const gamesAgo = latestSequence - sequence;
    
    // Player must have participated in the exact latest historical game to get 20 points
    if (sequence === latestSequence) {
      gameCategories.current++;
    }
    else if (gamesAgo <= 2) {
      gameCategories.recent++;
    }
    else if (gamesAgo <= 4) {
      gameCategories.newer++;
    }
    else if (gamesAgo <= 9) {
      gameCategories.mid++;
    }
    else if (gamesAgo <= 19) {
      gameCategories.older++;
    }
    else {
      gameCategories.oldest++;
    }
  });

  // Calculate XP for each category
  const categoryXP = {
    current: gameCategories.current * 20,
    recent: gameCategories.recent * 18,
    newer: gameCategories.newer * 16,
    mid: gameCategories.mid * 14,
    older: gameCategories.older * 12,
    oldest: gameCategories.oldest * 10
  };
  
  return Object.values(categoryXP).reduce((sum, xp) => sum + xp, 0);
};

export const calculatePlayerXP = ({
  caps = 0,
  activeBonuses = 0,
  activePenalties = 0,
  currentStreak = 0,
  dropoutPenalties = 0,
  gameSequences = [],
  latestSequence = 0
}: PlayerStats): number => {
  // Calculate base XP using weighted game points
  const baseXP = calculateWeightedBaseXP(
    gameSequences,
    caps,
    latestSequence
  );
  
  // Calculate streak multiplier (10% bonus per streak level)
  const streakMultiplier = Math.max(1, 1 + (currentStreak * 0.1));

  // Future implementations:
  // const bonusXP = activeBonuses * 100;
  // const penaltyXP = activePenalties * 100;
  // const dropoutXP = dropoutPenalties * 50;

  // Calculate final XP with streak multiplier
  const totalXP = Math.round(baseXP * streakMultiplier);
  // Future: const totalXP = Math.max(0, Math.round((baseXP * streakMultiplier) + bonusXP - penaltyXP - dropoutXP));

  return Math.max(0, totalXP);
};
