import type { BruteForcePlayer } from '../types';

/**
 * Calculate the average of a numeric array, excluding nulls
 */
function averageNonNull(values: (number | null)[]): number {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}

/**
 * Calculate the performance balance score
 * Measures the difference in recent win rate and goal differential between teams
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculatePerformanceScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): number {
  // Recent win rates (percentage 0-100)
  const blueWinRate = averageNonNull(blueTeam.map((p) => p.recentWinRate));
  const orangeWinRate = averageNonNull(orangeTeam.map((p) => p.recentWinRate));

  // If no performance data, default to 50% (neutral)
  const effectiveBlueWinRate =
    blueTeam.some((p) => p.recentWinRate !== null) ? blueWinRate : 50;
  const effectiveOrangeWinRate =
    orangeTeam.some((p) => p.recentWinRate !== null) ? orangeWinRate : 50;

  // Recent goal differentials (can be negative or positive)
  const blueGoalDiff = averageNonNull(blueTeam.map((p) => p.recentGoalDiff));
  const orangeGoalDiff = averageNonNull(orangeTeam.map((p) => p.recentGoalDiff));

  // Win rate difference (max is 100)
  const winRateDiff = Math.abs(effectiveBlueWinRate - effectiveOrangeWinRate) / 100;

  // Goal differential difference
  // Typical goal diff range is -10 to +10, so max diff is ~20
  const goalDiffDiff = Math.abs(blueGoalDiff - orangeGoalDiff) / 20;

  // Combine both metrics equally
  return (winRateDiff + goalDiffDiff) / 2;
}

/**
 * Get detailed performance breakdown for debugging
 */
export function getPerformanceBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): {
  blue: { winRate: number; goalDiff: number; playersWithData: number };
  orange: { winRate: number; goalDiff: number; playersWithData: number };
  gaps: { winRate: number; goalDiff: number };
} {
  const bluePlayersWithWinRate = blueTeam.filter((p) => p.recentWinRate !== null).length;
  const orangePlayersWithWinRate = orangeTeam.filter((p) => p.recentWinRate !== null).length;

  const blueWinRate = averageNonNull(blueTeam.map((p) => p.recentWinRate));
  const orangeWinRate = averageNonNull(orangeTeam.map((p) => p.recentWinRate));

  const blueGoalDiff = averageNonNull(blueTeam.map((p) => p.recentGoalDiff));
  const orangeGoalDiff = averageNonNull(orangeTeam.map((p) => p.recentGoalDiff));

  return {
    blue: {
      winRate: bluePlayersWithWinRate > 0 ? blueWinRate : 50,
      goalDiff: blueGoalDiff,
      playersWithData: bluePlayersWithWinRate,
    },
    orange: {
      winRate: orangePlayersWithWinRate > 0 ? orangeWinRate : 50,
      goalDiff: orangeGoalDiff,
      playersWithData: orangePlayersWithWinRate,
    },
    gaps: {
      winRate: Math.abs(
        (bluePlayersWithWinRate > 0 ? blueWinRate : 50) -
          (orangePlayersWithWinRate > 0 ? orangeWinRate : 50)
      ),
      goalDiff: Math.abs(blueGoalDiff - orangeGoalDiff),
    },
  };
}
