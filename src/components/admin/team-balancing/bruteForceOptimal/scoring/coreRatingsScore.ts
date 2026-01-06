import type { BruteForcePlayer } from '../types';

/**
 * Calculate the average of a numeric array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate the core ratings balance score
 * Measures the difference in Attack, Defense, Game IQ, and GK between teams
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculateCoreRatingsScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): number {
  // Calculate team averages for each metric
  const blueAttack = average(blueTeam.map((p) => p.attack));
  const orangeAttack = average(orangeTeam.map((p) => p.attack));

  const blueDefense = average(blueTeam.map((p) => p.defense));
  const orangeDefense = average(orangeTeam.map((p) => p.defense));

  const blueGameIq = average(blueTeam.map((p) => p.gameIq));
  const orangeGameIq = average(orangeTeam.map((p) => p.gameIq));

  const blueGk = average(blueTeam.map((p) => p.gk));
  const orangeGk = average(orangeTeam.map((p) => p.gk));

  // Calculate absolute differences
  const attackDiff = Math.abs(blueAttack - orangeAttack);
  const defenseDiff = Math.abs(blueDefense - orangeDefense);
  const gameIqDiff = Math.abs(blueGameIq - orangeGameIq);
  const gkDiff = Math.abs(blueGk - orangeGk);

  // Average of all differences
  // Ratings are on 1-10 scale, so max diff is 9
  // Normalize to roughly 0-1 scale by dividing by 9
  const totalDiff = (attackDiff + defenseDiff + gameIqDiff + gkDiff) / 4;
  return totalDiff / 9;
}

/**
 * Get detailed breakdown of core ratings balance
 */
export function getCoreRatingsBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): {
  blue: { attack: number; defense: number; gameIq: number; gk: number };
  orange: { attack: number; defense: number; gameIq: number; gk: number };
  gaps: { attack: number; defense: number; gameIq: number; gk: number };
} {
  const blue = {
    attack: average(blueTeam.map((p) => p.attack)),
    defense: average(blueTeam.map((p) => p.defense)),
    gameIq: average(blueTeam.map((p) => p.gameIq)),
    gk: average(blueTeam.map((p) => p.gk)),
  };

  const orange = {
    attack: average(orangeTeam.map((p) => p.attack)),
    defense: average(orangeTeam.map((p) => p.defense)),
    gameIq: average(orangeTeam.map((p) => p.gameIq)),
    gk: average(orangeTeam.map((p) => p.gk)),
  };

  return {
    blue,
    orange,
    gaps: {
      attack: Math.abs(blue.attack - orange.attack),
      defense: Math.abs(blue.defense - orange.defense),
      gameIq: Math.abs(blue.gameIq - orange.gameIq),
      gk: Math.abs(blue.gk - orange.gk),
    },
  };
}
