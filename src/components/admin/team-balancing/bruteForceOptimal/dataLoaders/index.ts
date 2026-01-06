import { loadPlayerStats } from './loadPlayerStats';
import { loadPerformance } from './loadPerformance';
import { loadChemistry, getChemistryPairKey, getChemistryScore } from './loadChemistry';
import { loadRivalry, getRivalryPairKey, getRivalryAdvantage } from './loadRivalry';
import { loadTrioChemistry, getTrioKey, getTrioScore, generateTrioCombinations } from './loadTrioChemistry';
import { loadPositions } from './loadPositions';
import { loadAttributes } from './loadAttributes';
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
 */
export function mergePlayerData(
  stats: PlayerStats[],
  performance: PlayerPerformance[],
  positions: PlayerPositionData[],
  attributes: PlayerAttributes[]
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

    return {
      player_id: stat.player_id,
      friendly_name: stat.friendly_name,
      attack,
      defense,
      gameIq,
      gk,
      overallRating,
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
