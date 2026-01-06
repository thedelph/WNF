import type { BruteForcePlayer, ChemistryMap } from '../types';
import { getChemistryPairKey } from '../dataLoaders/loadChemistry';

/**
 * Calculate the total chemistry score for a team
 * Sums chemistry scores for all pairs within the team
 */
function sumTeamChemistry(team: BruteForcePlayer[], chemistryMap: ChemistryMap): number {
  let totalChemistry = 0;
  let pairsCount = 0;

  // Iterate through all pairs in the team
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      const key = getChemistryPairKey(team[i].player_id, team[j].player_id);
      const pair = chemistryMap.get(key);
      if (pair && pair.games_together >= 3) {
        totalChemistry += pair.chemistry_score;
        pairsCount++;
      }
    }
  }

  // Return average chemistry per pair (or 50 as neutral if no pairs)
  return pairsCount > 0 ? totalChemistry / pairsCount : 50;
}

/**
 * Calculate the chemistry balance score
 * Measures the difference in total chemistry between teams
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculateChemistryScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  chemistryMap: ChemistryMap
): number {
  const blueChemistry = sumTeamChemistry(blueTeam, chemistryMap);
  const orangeChemistry = sumTeamChemistry(orangeTeam, chemistryMap);

  // Chemistry scores are 0-100, so max diff is 100
  // Normalize to 0-1 scale
  const diff = Math.abs(blueChemistry - orangeChemistry);
  return diff / 100;
}

/**
 * Get detailed chemistry breakdown for debugging
 */
export function getChemistryBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  chemistryMap: ChemistryMap
): {
  blueAvgChemistry: number;
  orangeAvgChemistry: number;
  bluePairsWithData: number;
  orangePairsWithData: number;
  gap: number;
} {
  let blueTotalChemistry = 0;
  let bluePairsCount = 0;
  let orangeTotalChemistry = 0;
  let orangePairsCount = 0;

  // Blue team pairs
  for (let i = 0; i < blueTeam.length; i++) {
    for (let j = i + 1; j < blueTeam.length; j++) {
      const key = getChemistryPairKey(blueTeam[i].player_id, blueTeam[j].player_id);
      const pair = chemistryMap.get(key);
      if (pair && pair.games_together >= 3) {
        blueTotalChemistry += pair.chemistry_score;
        bluePairsCount++;
      }
    }
  }

  // Orange team pairs
  for (let i = 0; i < orangeTeam.length; i++) {
    for (let j = i + 1; j < orangeTeam.length; j++) {
      const key = getChemistryPairKey(orangeTeam[i].player_id, orangeTeam[j].player_id);
      const pair = chemistryMap.get(key);
      if (pair && pair.games_together >= 3) {
        orangeTotalChemistry += pair.chemistry_score;
        orangePairsCount++;
      }
    }
  }

  const blueAvg = bluePairsCount > 0 ? blueTotalChemistry / bluePairsCount : 50;
  const orangeAvg = orangePairsCount > 0 ? orangeTotalChemistry / orangePairsCount : 50;

  return {
    blueAvgChemistry: blueAvg,
    orangeAvgChemistry: orangeAvg,
    bluePairsWithData: bluePairsCount,
    orangePairsWithData: orangePairsCount,
    gap: Math.abs(blueAvg - orangeAvg),
  };
}
