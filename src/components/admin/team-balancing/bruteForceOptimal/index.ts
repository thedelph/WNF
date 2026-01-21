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
import { loadAllPlayerData, mergePlayerData, augmentChemistryWithEstimates } from './dataLoaders';
import {
  calculateTotalScore,
  calculateScoreWithBreakdown,
  WEIGHTS,
} from './scoring';
import {
  generateValidCombinations,
  calculateTotalCombinations,
  getTierDistribution,
  calculateTierChangesFromForm,
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

  // Calculate data loading statistics (form stats will be added after merging)
  const baseDataLoadingStats = {
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
  console.log(`  - Chemistry pairs loaded: ${baseDataLoadingStats.chemistryPairsLoaded}`);
  console.log(`  - Rivalry pairs loaded: ${baseDataLoadingStats.rivalryPairsLoaded}`);
  console.log(`  - Trios loaded: ${baseDataLoadingStats.triosLoaded}`);
  console.log(`  - Players with win rate: ${baseDataLoadingStats.playersWithWinRate}/${baseDataLoadingStats.totalPlayers}`);
  console.log(`  - Players with goal diff: ${baseDataLoadingStats.playersWithGoalDiff}/${baseDataLoadingStats.totalPlayers}`);
  console.log(`  - Players with position data: ${baseDataLoadingStats.playersWithPosition}/${baseDataLoadingStats.totalPlayers}`);
  console.log(`  - Players with attributes: ${baseDataLoadingStats.playersWithAttributes}/${baseDataLoadingStats.totalPlayers}`);

  // 2. Merge into unified player objects (with form adjustment)
  const formAdjustmentFactor = options.formAdjustmentFactor ?? 0.5;
  const allPlayers = mergePlayerData(stats, perfData, positions, attributes, formAdjustmentFactor);
  console.log(`[BruteForce] Loaded ${allPlayers.length} players`);

  // 2.5 Calculate form adjustment stats
  const useFormAdjustedTiers = options.useFormAdjustedTiers !== false; // Default true
  const playersWithFormData = allPlayers.filter(p => p.formDelta !== 0).length;
  const avgFormDelta = playersWithFormData > 0
    ? allPlayers.reduce((sum, p) => sum + p.formDelta, 0) / allPlayers.length
    : 0;
  const tierChangesFromForm = useFormAdjustedTiers
    ? calculateTierChangesFromForm(allPlayers)
    : 0;

  if (options.debug && useFormAdjustedTiers) {
    console.log('[BruteForce] Form adjustment stats:');
    console.log(`  - Players with form data: ${playersWithFormData}/${allPlayers.length}`);
    console.log(`  - Avg form delta: ${(avgFormDelta * 100).toFixed(1)}%`);
    console.log(`  - Tier changes from form: ${tierChangesFromForm}`);
  }

  // 2.6 Augment chemistry with estimates if enabled
  const enableChemistryEstimation = options.enableChemistryEstimation !== false; // Default true
  let chemistryMapToUse = chemistry;
  let estimatedChemistryPairs = 0;
  let avgEstimationConfidence = 0;

  if (enableChemistryEstimation) {
    const { augmentedMap, stats } = augmentChemistryWithEstimates(chemistry, allPlayers);
    chemistryMapToUse = augmentedMap;
    estimatedChemistryPairs = stats.estimatedPairs;
    avgEstimationConfidence = stats.avgConfidence;

    if (options.debug) {
      console.log('[BruteForce] Chemistry estimation stats:');
      console.log(`  - Real chemistry pairs: ${stats.realPairs}`);
      console.log(`  - Estimated pairs: ${stats.estimatedPairs}`);
      console.log(`  - Avg estimation confidence: ${(stats.avgConfidence * 100).toFixed(0)}%`);
    }
  }

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

  // Prepare scoring options
  const enablePerMetricTierPenalty = options.enablePerMetricTierPenalty !== false; // Default true
  const scoreOptions = { enablePerMetricTierPenalty };

  for (const [blue, orange] of generateValidCombinations(outfieldPlayers, useFormAdjustedTiers)) {
    const score = calculateTotalScore(
      blue,
      orange,
      chemistryMapToUse,
      rivalry,
      trios,
      weights,
      outfieldPlayers,
      scoreOptions
    );
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
    chemistryMapToUse,
    rivalry,
    trios,
    weights,
    outfieldPlayers,
    scoreOptions
  );

  // 8. Get tier distribution for verification (using form-adjusted if enabled)
  const tierDistribution = getTierDistribution(
    bestTeams[0],
    bestTeams[1],
    outfieldPlayers,
    useFormAdjustedTiers
  );

  // 9. Compile final data loading stats
  const dataLoadingStats = {
    ...baseDataLoadingStats,
    // Form adjustment stats
    playersWithFormData,
    avgFormDelta,
    tierChangesFromForm,
    // Chemistry estimation stats
    estimatedChemistryPairs,
    avgEstimationConfidence,
  };

  console.log(`[BruteForce] Complete!`);
  console.log(`  - Combinations evaluated: ${combinationsEvaluated.toLocaleString()}`);
  console.log(`  - Best score: ${bestScore.toFixed(4)}`);
  console.log(`  - Compute time: ${computeTimeMs.toFixed(0)}ms`);
  console.log(`  - Tier distribution: Blue ${tierDistribution.blue.top}-${tierDistribution.blue.middle}-${tierDistribution.blue.bottom}, Orange ${tierDistribution.orange.top}-${tierDistribution.orange.middle}-${tierDistribution.orange.bottom}`);
  if (useFormAdjustedTiers) {
    console.log(`  - Form adjustment: ${tierChangesFromForm} tier changes`);
  }

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
    // Include maps for detailed debug logging (chemistryMap includes estimates if enabled)
    chemistryMap: chemistryMapToUse,
    rivalryMap: rivalry,
    trioMap: trios,
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

// Re-export breakdown functions for detailed debug logging
export {
  getCoreRatingsBreakdown,
  getPerformanceBreakdown,
  getFormBreakdown,
  getPositionBreakdown,
  getAttributeBreakdown,
  getChemistryBreakdown,
  getRivalryBreakdown,
  getTrioBreakdown,
} from './scoring';
