import type { BruteForcePlayer, TrioMap } from '../types';
import { getTrioKey, generateTrioCombinations } from '../dataLoaders/loadTrioChemistry';

/**
 * Calculate the average trio chemistry score for a team
 * Considers all possible trios within the team
 */
function sumTeamTrioChemistry(team: BruteForcePlayer[], trioMap: TrioMap): number {
  const playerIds = team.map((p) => p.player_id);
  const trios = generateTrioCombinations(playerIds);

  let totalTrioScore = 0;
  let triosWithData = 0;

  for (const [id1, id2, id3] of trios) {
    const key = getTrioKey(id1, id2, id3);
    const trio = trioMap.get(key);

    if (trio) {
      totalTrioScore += trio.trio_score;
      triosWithData++;
    }
  }

  // Return average trio score, or 50 as neutral if no data
  return triosWithData > 0 ? totalTrioScore / triosWithData : 50;
}

/**
 * Calculate the trio chemistry balance score
 * Measures the difference in trio synergies between teams
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculateTrioScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  trioMap: TrioMap
): number {
  const blueTrioAvg = sumTeamTrioChemistry(blueTeam, trioMap);
  const orangeTrioAvg = sumTeamTrioChemistry(orangeTeam, trioMap);

  // Trio scores are 0-100, so max diff is 100
  // Normalize to 0-1 scale
  const diff = Math.abs(blueTrioAvg - orangeTrioAvg);
  return diff / 100;
}

/**
 * Get detailed trio chemistry breakdown for debugging
 */
export function getTrioBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  trioMap: TrioMap
): {
  blueAvgTrioScore: number;
  orangeAvgTrioScore: number;
  blueTriosWithData: number;
  orangeTriosWithData: number;
  blueTotalTrios: number;
  orangeTotalTrios: number;
  gap: number;
  topBlueTrio: { players: string[]; score: number } | null;
  topOrangeTrio: { players: string[]; score: number } | null;
} {
  const bluePlayerIds = blueTeam.map((p) => p.player_id);
  const orangePlayerIds = orangeTeam.map((p) => p.player_id);
  const blueTrios = generateTrioCombinations(bluePlayerIds);
  const orangeTrios = generateTrioCombinations(orangePlayerIds);

  // Create lookup for friendly names
  const nameMap = new Map<string, string>();
  for (const p of [...blueTeam, ...orangeTeam]) {
    nameMap.set(p.player_id, p.friendly_name);
  }

  let blueTotalScore = 0;
  let blueTriosCount = 0;
  let topBlue: { players: string[]; score: number } | null = null;
  let maxBlueScore = -1;

  for (const [id1, id2, id3] of blueTrios) {
    const key = getTrioKey(id1, id2, id3);
    const trio = trioMap.get(key);

    if (trio) {
      blueTotalScore += trio.trio_score;
      blueTriosCount++;

      if (trio.trio_score > maxBlueScore) {
        maxBlueScore = trio.trio_score;
        topBlue = {
          players: [nameMap.get(id1) || id1, nameMap.get(id2) || id2, nameMap.get(id3) || id3],
          score: trio.trio_score,
        };
      }
    }
  }

  let orangeTotalScore = 0;
  let orangeTriosCount = 0;
  let topOrange: { players: string[]; score: number } | null = null;
  let maxOrangeScore = -1;

  for (const [id1, id2, id3] of orangeTrios) {
    const key = getTrioKey(id1, id2, id3);
    const trio = trioMap.get(key);

    if (trio) {
      orangeTotalScore += trio.trio_score;
      orangeTriosCount++;

      if (trio.trio_score > maxOrangeScore) {
        maxOrangeScore = trio.trio_score;
        topOrange = {
          players: [nameMap.get(id1) || id1, nameMap.get(id2) || id2, nameMap.get(id3) || id3],
          score: trio.trio_score,
        };
      }
    }
  }

  const blueAvg = blueTriosCount > 0 ? blueTotalScore / blueTriosCount : 50;
  const orangeAvg = orangeTriosCount > 0 ? orangeTotalScore / orangeTriosCount : 50;

  return {
    blueAvgTrioScore: blueAvg,
    orangeAvgTrioScore: orangeAvg,
    blueTriosWithData: blueTriosCount,
    orangeTriosWithData: orangeTriosCount,
    blueTotalTrios: blueTrios.length,
    orangeTotalTrios: orangeTrios.length,
    gap: Math.abs(blueAvg - orangeAvg),
    topBlueTrio: topBlue,
    topOrangeTrio: topOrange,
  };
}
