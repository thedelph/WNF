import type { BruteForcePlayer, RivalryMap } from '../types';
import { getRivalryPairKey } from '../dataLoaders/loadRivalry';

/**
 * Calculate the cross-team rivalry advantage for a team configuration
 *
 * This measures how much advantage one team has based on historical
 * head-to-head matchups between opposing players.
 *
 * Example: If Stephen (blue) consistently beats Dom (orange), blue has an advantage.
 *
 * Returns: Net advantage from blue team's perspective (-50 to +50 scale)
 */
function calculateTeamRivalryAdvantage(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  rivalryMap: RivalryMap
): number {
  let totalAdvantage = 0;
  let matchupsCount = 0;

  // For each blue player vs each orange player
  for (const bluePlayer of blueTeam) {
    for (const orangePlayer of orangeTeam) {
      const key = getRivalryPairKey(bluePlayer.player_id, orangePlayer.player_id);
      const rivalry = rivalryMap.get(key);

      if (rivalry) {
        matchupsCount++;

        // rivalry_score is from the perspective of the player with the smaller ID
        // If blue player has smaller ID: advantage = rivalry_score - 50
        // If orange player has smaller ID: advantage = -(rivalry_score - 50)
        const isBlueFirst = bluePlayer.player_id < orangePlayer.player_id;
        const advantage = rivalry.rivalry_score - 50;

        // Add from blue's perspective
        totalAdvantage += isBlueFirst ? advantage : -advantage;
      }
    }
  }

  // Return average advantage per matchup, or 0 if no matchups
  return matchupsCount > 0 ? totalAdvantage / matchupsCount : 0;
}

/**
 * Calculate the rivalry balance score
 * Measures how balanced the cross-team matchups are
 *
 * A perfectly balanced game has no net advantage for either team.
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 *          Range: 0 to 1 (where 1 = maximum imbalance of 50 point advantage)
 */
export function calculateRivalryScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  rivalryMap: RivalryMap
): number {
  const netAdvantage = calculateTeamRivalryAdvantage(blueTeam, orangeTeam, rivalryMap);

  // Advantage ranges from -50 to +50, so abs max is 50
  // Normalize to 0-1 scale
  return Math.abs(netAdvantage) / 50;
}

/**
 * Get detailed rivalry breakdown for debugging
 */
export function getRivalryBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  rivalryMap: RivalryMap
): {
  netBlueAdvantage: number;
  matchupsWithData: number;
  totalMatchups: number;
  mostLopsidedMatchup: {
    bluePlayer: string;
    orangePlayer: string;
    blueAdvantage: number;
  } | null;
} {
  let totalAdvantage = 0;
  let matchupsCount = 0;
  const totalMatchups = blueTeam.length * orangeTeam.length;
  let mostLopsided: { bluePlayer: string; orangePlayer: string; blueAdvantage: number } | null = null;
  let maxAbsAdvantage = 0;

  for (const bluePlayer of blueTeam) {
    for (const orangePlayer of orangeTeam) {
      const key = getRivalryPairKey(bluePlayer.player_id, orangePlayer.player_id);
      const rivalry = rivalryMap.get(key);

      if (rivalry) {
        matchupsCount++;
        const isBlueFirst = bluePlayer.player_id < orangePlayer.player_id;
        const rawAdvantage = rivalry.rivalry_score - 50;
        const blueAdvantage = isBlueFirst ? rawAdvantage : -rawAdvantage;

        totalAdvantage += blueAdvantage;

        // Track most lopsided matchup
        if (Math.abs(blueAdvantage) > maxAbsAdvantage) {
          maxAbsAdvantage = Math.abs(blueAdvantage);
          mostLopsided = {
            bluePlayer: bluePlayer.friendly_name,
            orangePlayer: orangePlayer.friendly_name,
            blueAdvantage,
          };
        }
      }
    }
  }

  return {
    netBlueAdvantage: matchupsCount > 0 ? totalAdvantage / matchupsCount : 0,
    matchupsWithData: matchupsCount,
    totalMatchups,
    mostLopsidedMatchup: mostLopsided,
  };
}
