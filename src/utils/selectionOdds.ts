/**
 * Utility functions for calculating player selection odds
 * Based on the player selection process documented in PlayerSelectionExplained.md
 */

export interface PlayerOdds {
  percentage: number;
  status: 'guaranteed' | 'merit' | 'random' | 'unlikely';
  description: string;
}

interface PlayerForOdds {
  using_token?: boolean;
  id: string;
}

interface PlayerStatsForOdds {
  benchWarmerStreak?: number;
  xp?: number;
  rank?: number;
}

/**
 * Calculate selection odds for each player in the registration list
 *
 * @param sortedRegistrations - Players sorted by selection priority (tokens first, then XP)
 * @param playerStats - Stats for each player including bench warmer streak, XP, and rank
 * @param tokenCooldownPlayerIds - Set of player IDs on token cooldown
 * @param xpSlots - Number of slots for merit-based selection
 * @param randomSlots - Number of slots for random selection
 * @param maxPlayers - Maximum number of players in the game
 * @param unregisteredTokenHoldersCount - Number of players with available tokens who haven't registered yet
 * @param unregisteredPlayersXP - Array of XP values for unregistered players (sorted descending)
 * @returns Map of player ID to their selection odds
 */
export function calculateSelectionOdds(
  sortedRegistrations: Array<{ player: PlayerForOdds }>,
  playerStats: Record<string, PlayerStatsForOdds>,
  tokenCooldownPlayerIds: Set<string>,
  xpSlots: number,
  randomSlots: number,
  maxPlayers: number,
  unregisteredTokenHoldersCount: number = 0,
  unregisteredPlayersXP: number[] = []
): Map<string, PlayerOdds> {
  const oddsMap = new Map<string, PlayerOdds>();

  // If everyone gets in, everyone is guaranteed
  if (sortedRegistrations.length <= maxPlayers) {
    sortedRegistrations.forEach(reg => {
      oddsMap.set(reg.player.id, {
        percentage: 100,
        status: 'guaranteed',
        description: 'Everyone plays when registrations ≤ ' + maxPlayers
      });
    });
    return oddsMap;
  }

  // Identify guaranteed players (tokens and merit-based)
  sortedRegistrations.forEach((reg, index) => {
    const playerId = reg.player.id;
    const playerXP = playerStats[playerId]?.xp || 0;

    // Token users are guaranteed
    if (reg.player.using_token) {
      oddsMap.set(playerId, {
        percentage: 100,
        status: 'guaranteed',
        description: 'Priority Token - Guaranteed slot'
      });
      return;
    }

    // Count how many unregistered players have higher XP than this player
    const higherXPUnregistered = unregisteredPlayersXP.filter(xp => xp > playerXP).length;

    // Tokens reduce available XP slots when used
    const effectiveXpSlots = xpSlots - unregisteredTokenHoldersCount;

    // Calculate how many spots down they could be pushed (only XP affects position)
    const wouldBeAtPosition = index + higherXPUnregistered;

    // Merit-based players (currently within XP slots)
    if (index < xpSlots) {
      // Completely safe - even with all risks, still in merit zone
      if (wouldBeAtPosition < effectiveXpSlots) {
        oddsMap.set(playerId, {
          percentage: 100,
          status: 'merit',
          description: 'Merit Selection - Safe from unregistered players'
        });
        return;
      }

      // Would be pushed into random zone if risks materialize
      if (wouldBeAtPosition >= effectiveXpSlots) {
        // Calculate probability based on registration likelihood
        // Assume 40% chance each higher-XP player registers
        // Assume 50% chance each token holder registers and uses token
        const expectedHigherXPRegistrations = higherXPUnregistered * 0.4;
        const expectedTokenUsage = unregisteredTokenHoldersCount * 0.5;
        const expectedPushDown = expectedHigherXPRegistrations;
        const expectedXpSlots = xpSlots - (unregisteredTokenHoldersCount * 0.5);
        const likelyPosition = index + expectedPushDown;

        // Still likely in merit zone
        if (likelyPosition < expectedXpSlots - 1) {
          const riskDescription = [];
          if (higherXPUnregistered > 0) riskDescription.push(`${higherXPUnregistered} higher-XP player${higherXPUnregistered > 1 ? 's' : ''}`);
          if (unregisteredTokenHoldersCount > 0) riskDescription.push(`${unregisteredTokenHoldersCount} token holder${unregisteredTokenHoldersCount > 1 ? 's' : ''}`);

          oddsMap.set(playerId, {
            percentage: 85,
            status: 'merit',
            description: `Merit Selection - Likely safe (at risk from ${riskDescription.join(' and ')})`
          });
          return;
        }

        // Borderline - could go either way
        const riskDescription = [];
        if (higherXPUnregistered > 0) riskDescription.push(`${higherXPUnregistered} higher-XP player${higherXPUnregistered > 1 ? 's' : ''}`);
        if (unregisteredTokenHoldersCount > 0) riskDescription.push(`${unregisteredTokenHoldersCount} token holder${unregisteredTokenHoldersCount > 1 ? 's' : ''}`);

        oddsMap.set(playerId, {
          percentage: 60,
          status: 'merit',
          description: `Merit Selection - At risk from ${riskDescription.join(' and ')}`
        });
        return;
      }
    }
  });

  // Calculate odds for random selection zone
  const randomZonePlayers = sortedRegistrations.slice(xpSlots);

  if (randomZonePlayers.length === 0) {
    return oddsMap;
  }

  // Calculate total points for weighted random selection
  // Base weight: 1 point + bench_warmer_streak points
  let totalPoints = 0;
  const playerPoints = new Map<string, number>();

  randomZonePlayers.forEach(reg => {
    const benchWarmerStreak = playerStats[reg.player.id]?.benchWarmerStreak || 0;
    const points = 1 + benchWarmerStreak; // Base 1 + streak bonus
    playerPoints.set(reg.player.id, points);
    totalPoints += points;
  });

  // Calculate probability for each player in random zone
  // Using approximation: For weighted selection without replacement,
  // probability ≈ (player_weight / total_weight) × number_of_selections
  // This is a reasonable approximation for small selection counts
  randomZonePlayers.forEach(reg => {
    const playerId = reg.player.id;
    const points = playerPoints.get(playerId) || 1;

    // Calculate selection probability
    // Formula: (weight / total_weight) × slots_to_fill
    // Capped at 100% for cases where calculation might exceed
    const rawProbability = (points / totalPoints) * randomSlots;
    const percentage = Math.min(100, Math.round(rawProbability * 100));

    const benchWarmerStreak = playerStats[playerId]?.benchWarmerStreak || 0;

    oddsMap.set(playerId, {
      percentage,
      status: 'random',
      description: benchWarmerStreak > 0
        ? `Random Selection - ${benchWarmerStreak} game${benchWarmerStreak > 1 ? 's' : ''} as reserve boosts odds`
        : 'Random Selection - Base odds'
    });
  });

  return oddsMap;
}

/**
 * Format odds for display
 * Only shows percentages for random zone players
 */
export function formatOdds(odds: PlayerOdds): string {
  // Only show percentages for random selection zone
  if (odds.status === 'random') {
    return `${odds.percentage}%`;
  }

  // For merit and guaranteed, just show status
  if (odds.percentage === 100) {
    return 'Guaranteed';
  }

  // For merit zone players with < 100% odds, show status instead of percentage
  return 'At Risk';
}

/**
 * Get color class for odds display
 */
export function getOddsColorClass(odds: PlayerOdds): string {
  if (odds.percentage === 100) {
    return 'text-success';
  }
  if (odds.percentage >= 85) {
    return 'text-success';
  }
  if (odds.percentage >= 50) {
    return 'text-warning';
  }
  return 'text-error';
}
