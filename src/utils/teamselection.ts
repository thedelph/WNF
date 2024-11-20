interface PlayerWithStats {
  id: string;
  player_id: string;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  attack_rating?: number;
  defense_rating?: number;
}

interface SelectionResult {
  selectedPlayerIds: string[];
  reservePlayerIds: string[];
}

export const selectTeamMembers = (
  registrations: PlayerWithStats[],
  maxPlayers: number,
  randomSlots: number
): SelectionResult => {
  if (!Array.isArray(registrations)) {
    console.error('Invalid registrations data:', registrations);
    throw new Error('Registrations must be an array');
  }

  try {
    // Calculate number of merit-based slots
    const meritSlots = maxPlayers - randomSlots;

    // Sort players by XP in descending order
    const sortedPlayers = [...registrations].sort((a, b) => {
      const xpA = calculatePlayerXP(a);
      const xpB = calculatePlayerXP(b);
      return xpB - xpA;
    });

    // Select merit-based players
    const meritBasedPlayers = sortedPlayers.slice(0, meritSlots);

    // Get remaining players for random selection
    const remainingPlayers = sortedPlayers.filter(
      p => !meritBasedPlayers.find(m => m.player_id === p.player_id)
    );

    // Randomly select players for random slots
    const randomlySelected = shuffleArray(remainingPlayers)
      .slice(0, randomSlots);

    // Combine selected players
    const selectedPlayerIds = [...meritBasedPlayers.map(p => p.player_id), ...randomlySelected.map(p => p.player_id)];

    // Determine reserve players (everyone else)
    const reservePlayerIds = remainingPlayers.filter(
      p => !selectedPlayerIds.includes(p.player_id)
    ).map(p => p.player_id);

    return {
      selectedPlayerIds,
      reservePlayerIds
    };
  } catch (error) {
    console.error('Error selecting team members:', error);
    throw error;
  }
};

// Helper function to calculate player XP
const calculatePlayerXP = (player: PlayerWithStats): number => {
  const baseXP = player.caps;
  const bonusModifier = player.active_bonuses * 0.1;
  const penaltyModifier = player.active_penalties * -0.1;
  const streakModifier = player.current_streak * 0.1;
  
  return baseXP * (1 + bonusModifier + penaltyModifier + streakModifier);
};

// Helper function to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
