/**
 * Brute-Force Optimal Team Balancing Algorithm
 *
 * This algorithm evaluates all valid team combinations and selects the
 * objectively best balanced teams. It guarantees the optimal solution
 * within the spread constraint (equal distribution from top/middle/bottom thirds).
 *
 * Key features:
 * - Modular scoring: Core ratings (40%), Chemistry (20%), Performance (20%),
 *   Position (10%), Attributes (10%)
 * - Spread constraint: Each team gets equal players from each skill tier
 * - Guaranteed optimal within ~8,000 combinations for 18 players
 */

import type {
  BruteForcePlayer,
  BruteForceTeamResult,
  BruteForceOptions,
  ScoringWeights,
  ChemistryMap,
  RivalryMap,
  TrioMap,
} from './types';
import { DEFAULT_WEIGHTS } from './types';
import { loadAllPlayerData, mergePlayerData } from './dataLoaders';
import {
  calculateTotalScore,
  calculateScoreWithBreakdown,
  WEIGHTS,
} from './scoring';
import {
  generateValidCombinations,
  calculateTotalCombinations,
  getTierDistribution,
} from './combinationGenerator';

// Re-export types for convenience
export type {
  BruteForcePlayer,
  BruteForceTeamResult,
  BruteForceOptions,
  ScoringWeights,
};

/**
 * Generate optimal teams using the brute-force algorithm
 *
 * @param playerIds - Array of player IDs to distribute into teams
 * @param options - Optional configuration (permanent GK, custom weights, debug mode)
 * @returns The optimal team assignment with scoring details
 */
export async function generateOptimalTeams(
  playerIds: string[],
  options: BruteForceOptions = {}
): Promise<BruteForceTeamResult> {
  const startTime = performance.now();

  // 1. Load all data in parallel
  console.log('[BruteForce] Loading player data...');
  const { stats, performance: perfData, chemistry, rivalry, trios, positions, attributes } =
    await loadAllPlayerData(playerIds);

  // Calculate data loading statistics
  const dataLoadingStats = {
    chemistryPairsLoaded: chemistry.size,
    rivalryPairsLoaded: rivalry.size,
    triosLoaded: trios.size,
    playersWithWinRate: perfData.filter(p => p.recent_win_rate !== null).length,
    playersWithGoalDiff: perfData.filter(p => p.recent_goal_differential !== null).length,
    playersWithPosition: positions.filter(p => p.primary_position !== null).length,
    playersWithAttributes: attributes.filter(p => p.pace > 0 || p.shooting > 0).length,
    totalPlayers: perfData.length,
  };

  // Debug: Log data loading statistics
  console.log('[BruteForce] Data loading stats:');
  console.log(`  - Chemistry pairs loaded: ${dataLoadingStats.chemistryPairsLoaded}`);
  console.log(`  - Rivalry pairs loaded: ${dataLoadingStats.rivalryPairsLoaded}`);
  console.log(`  - Trios loaded: ${dataLoadingStats.triosLoaded}`);
  console.log(`  - Players with win rate: ${dataLoadingStats.playersWithWinRate}/${dataLoadingStats.totalPlayers}`);
  console.log(`  - Players with goal diff: ${dataLoadingStats.playersWithGoalDiff}/${dataLoadingStats.totalPlayers}`);
  console.log(`  - Players with position data: ${dataLoadingStats.playersWithPosition}/${dataLoadingStats.totalPlayers}`);
  console.log(`  - Players with attributes: ${dataLoadingStats.playersWithAttributes}/${dataLoadingStats.totalPlayers}`);

  // 2. Merge into unified player objects
  const allPlayers = mergePlayerData(stats, perfData, positions, attributes);
  console.log(`[BruteForce] Loaded ${allPlayers.length} players`);

  // 3. Handle permanent GK if specified
  const outfieldPlayers = options.permanentGKId
    ? allPlayers.filter((p) => p.player_id !== options.permanentGKId)
    : allPlayers;

  console.log(`[BruteForce] Outfield players: ${outfieldPlayers.length}`);

  // 4. Calculate expected combinations
  const expectedCombinations = calculateTotalCombinations(outfieldPlayers.length);
  console.log(`[BruteForce] Expected combinations: ${expectedCombinations.toLocaleString()}`);

  // 5. Merge weights with defaults
  const weights: ScoringWeights = {
    ...WEIGHTS,
    ...options.weights,
  };

  // 6. Generate and score all valid combinations
  let bestScore = Infinity;
  let bestTeams: [BruteForcePlayer[], BruteForcePlayer[]] | null = null;
  let combinationsEvaluated = 0;

  for (const [blue, orange] of generateValidCombinations(outfieldPlayers)) {
    const score = calculateTotalScore(blue, orange, chemistry, rivalry, trios, weights);
    combinationsEvaluated++;

    if (score < bestScore) {
      bestScore = score;
      bestTeams = [blue, orange];

      if (options.debug) {
        console.log(
          `[BruteForce] New best @ ${combinationsEvaluated}: score=${score.toFixed(4)}`
        );
      }
    }

    // Progress logging every 1000 combinations
    if (options.debug && combinationsEvaluated % 1000 === 0) {
      console.log(
        `[BruteForce] Progress: ${combinationsEvaluated}/${expectedCombinations} (${(
          (combinationsEvaluated / expectedCombinations) *
          100
        ).toFixed(1)}%)`
      );
    }
  }

  const endTime = performance.now();
  const computeTimeMs = endTime - startTime;

  if (!bestTeams) {
    throw new Error('No valid team combinations found');
  }

  // 7. Calculate detailed breakdown for the best result
  const scoreBreakdown = calculateScoreWithBreakdown(
    bestTeams[0],
    bestTeams[1],
    chemistry,
    rivalry,
    trios,
    weights
  );

  // 8. Get tier distribution for verification
  const tierDistribution = getTierDistribution(
    bestTeams[0],
    bestTeams[1],
    outfieldPlayers
  );

  console.log(`[BruteForce] Complete!`);
  console.log(`  - Combinations evaluated: ${combinationsEvaluated.toLocaleString()}`);
  console.log(`  - Best score: ${bestScore.toFixed(4)}`);
  console.log(`  - Compute time: ${computeTimeMs.toFixed(0)}ms`);
  console.log(`  - Tier distribution: Blue ${tierDistribution.blue.top}-${tierDistribution.blue.middle}-${tierDistribution.blue.bottom}, Orange ${tierDistribution.orange.top}-${tierDistribution.orange.middle}-${tierDistribution.orange.bottom}`);

  return {
    blueTeam: bestTeams[0],
    orangeTeam: bestTeams[1],
    balanceScore: bestScore,
    scoreBreakdown,
    combinationsEvaluated,
    computeTimeMs,
    algorithm: 'brute-force-optimal',
    tierDistribution,
    dataLoadingStats,
  };
}

// Import TeamAssignment type for the conversion function
import type { TeamAssignment } from '../types';

/**
 * Convert BruteForcePlayer to TeamAssignment format for compatibility
 * with existing UI components
 */
export function toTeamAssignment(
  player: BruteForcePlayer,
  team: 'blue' | 'orange'
): TeamAssignment {
  return {
    team,
    player_id: player.player_id,
    friendly_name: player.friendly_name,
    attack_rating: player.attack,
    defense_rating: player.defense,
    game_iq_rating: player.gameIq,
    gk_rating: player.gk,
    win_rate: player.recentWinRate,
    goal_differential: player.recentGoalDiff,
    overall_win_rate: player.overallWinRate,
    derived_attributes: {
      pace: player.attributes.pace,
      shooting: player.attributes.shooting,
      passing: player.attributes.passing,
      dribbling: player.attributes.dribbling,
      defending: player.attributes.defending,
      physical: player.attributes.physical,
    },
  };
}

/**
 * Convert full result to TeamAssignment arrays for UI compatibility
 */
export function resultToTeamAssignments(result: BruteForceTeamResult): {
  blueTeam: TeamAssignment[];
  orangeTeam: TeamAssignment[];
} {
  return {
    blueTeam: result.blueTeam.map((p) => toTeamAssignment(p, 'blue')),
    orangeTeam: result.orangeTeam.map((p) => toTeamAssignment(p, 'orange')),
  };
}
