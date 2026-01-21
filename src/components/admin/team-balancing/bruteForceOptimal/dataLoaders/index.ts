import { loadPlayerStats } from './loadPlayerStats';
import { loadPerformance } from './loadPerformance';
import { loadChemistry, getChemistryPairKey, getChemistryScore } from './loadChemistry';
import { loadRivalry, getRivalryPairKey, getRivalryAdvantage } from './loadRivalry';
import { loadTrioChemistry, getTrioKey, getTrioScore, generateTrioCombinations } from './loadTrioChemistry';
import { loadPositions } from './loadPositions';
import { loadAttributes } from './loadAttributes';
import {
  estimateChemistryScore,
  augmentChemistryWithEstimates,
  type EstimatedChemistry,
  type ChemistryEstimationStats,
} from './estimateChemistry';
import type {
  BruteForcePlayer,
  PlayerStats,
  PlayerPerformance,
  ChemistryMap,
  RivalryMap,
  TrioMap,
  PlayerPositionData,
  PlayerAttributes,
} from '../types';

export {
  loadPlayerStats,
  loadPerformance,
  loadChemistry,
  loadRivalry,
  loadTrioChemistry,
  loadPositions,
  loadAttributes,
  getChemistryPairKey,
  getChemistryScore,
  getRivalryPairKey,
  getRivalryAdvantage,
  getTrioKey,
  getTrioScore,
  generateTrioCombinations,
  // Chemistry estimation
  estimateChemistryScore,
  augmentChemistryWithEstimates,
  type EstimatedChemistry,
  type ChemistryEstimationStats,
};

/**
 * Load all player data in parallel
 */
export async function loadAllPlayerData(playerIds: string[]): Promise<{
  stats: PlayerStats[];
  performance: PlayerPerformance[];
  chemistry: ChemistryMap;
  rivalry: RivalryMap;
  trios: TrioMap;
  positions: PlayerPositionData[];
  attributes: PlayerAttributes[];
}> {
  const [stats, performance, chemistry, rivalry, trios, positions, attributes] = await Promise.all([
    loadPlayerStats(playerIds),
    loadPerformance(playerIds),
    loadChemistry(playerIds),
    loadRivalry(playerIds),
    loadTrioChemistry(playerIds),
    loadPositions(playerIds),
    loadAttributes(playerIds),
  ]);

  return { stats, performance, chemistry, rivalry, trios, positions, attributes };
}

/**
 * Merge all data sources into unified BruteForcePlayer objects
 *
 * @param stats - Player stats from the database
 * @param performance - Recent performance data
 * @param positions - Position consensus data
 * @param attributes - Derived attributes from playstyles
 * @param formAdjustmentFactor - Factor for form adjustment (default: 0.10)
 */
export function mergePlayerData(
  stats: PlayerStats[],
  performance: PlayerPerformance[],
  positions: PlayerPositionData[],
  attributes: PlayerAttributes[],
  formAdjustmentFactor: number = 0.10
): BruteForcePlayer[] {
  // Create lookup maps
  const performanceMap = new Map(performance.map((p) => [p.player_id, p]));
  const positionsMap = new Map(positions.map((p) => [p.player_id, p]));
  const attributesMap = new Map(attributes.map((p) => [p.player_id, p]));

  return stats.map((stat) => {
    const perf = performanceMap.get(stat.player_id);
    const pos = positionsMap.get(stat.player_id);
    const attrs = attributesMap.get(stat.player_id);

    // Core ratings default to 5 if null
    const attack = stat.attack_rating ?? 5;
    const defense = stat.defense_rating ?? 5;
    const gameIq = stat.game_iq ?? 5;
    const gk = stat.gk ?? 5;

    // Calculate overall rating for tier sorting (simple average of core skills)
    const overallRating = (attack + defense + gameIq + gk) / 4;

    // Calculate form delta (recent vs career win rate)
    // Normalized to -1 to +1 range where:
    //   +1 = recent win rate is 100% higher than career
    //   -1 = recent win rate is 100% lower than career
    //    0 = no form data or equal performance
    //
    // Note: Career win rate may be 0 or null for players with < 10 games
    // In that case, we skip form adjustment (not enough baseline data)
    const hasValidCareerWR = stat.win_rate !== null && stat.win_rate > 0;
    const rawFormDelta =
      perf?.recent_win_rate !== null && hasValidCareerWR
        ? (perf.recent_win_rate - stat.win_rate) / 100
        : 0;

    // Only apply POSITIVE form adjustments if recent win rate > 50%
    // (A "hot streak" should mean actually winning, not just losing less)
    // Negative adjustments (cold streaks) always apply regardless of absolute WR
    const formDelta =
      rawFormDelta > 0 && perf?.recent_win_rate !== null && perf.recent_win_rate <= 50
        ? 0 // Don't boost players who are still losing more than winning
        : rawFormDelta;

    // Form-adjusted rating: hot streaks push players up, cold streaks push down
    // Example: +10% recent vs career (formDelta = 0.1) with factor 0.10:
    //   adjustment = 0.1 * 0.10 * 10 = +0.10 rating boost
    //
    // Cap at ±0.25 to prevent form from having outsized impact on tier placement
    // (win rate is noisy and team-dependent, shouldn't override skill ratings much)
    const MAX_FORM_ADJUSTMENT = 0.25;
    const rawAdjustment = formDelta * formAdjustmentFactor * 10;
    const cappedAdjustment = Math.max(-MAX_FORM_ADJUSTMENT, Math.min(MAX_FORM_ADJUSTMENT, rawAdjustment));
    const formAdjustedRating = overallRating + cappedAdjustment;

    return {
      player_id: stat.player_id,
      friendly_name: stat.friendly_name,
      attack,
      defense,
      gameIq,
      gk,
      overallRating,
      formAdjustedRating,
      formDelta,
      recentWinRate: perf?.recent_win_rate ?? null,
      recentGoalDiff: perf?.recent_goal_differential ?? null,
      overallWinRate: stat.win_rate,
      primaryPosition: pos?.primary_position ?? null,
      positions: pos?.positions ?? [],
      attributes: {
        pace: attrs?.pace ?? 0,
        shooting: attrs?.shooting ?? 0,
        passing: attrs?.passing ?? 0,
        dribbling: attrs?.dribbling ?? 0,
        defending: attrs?.defending ?? 0,
        physical: attrs?.physical ?? 0,
      },
    };
  });
}
