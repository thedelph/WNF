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
 * Measures the difference in OVERALL/CAREER win rate between teams
 *
 * This represents baseline player ability, not current form.
 * Current form (recent vs career) is handled by formScore.ts
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 */
export function calculatePerformanceScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): number {
  // Overall/career win rates (percentage 0-100)
  const blueWinRate = averageNonNull(blueTeam.map((p) => p.overallWinRate));
  const orangeWinRate = averageNonNull(orangeTeam.map((p) => p.overallWinRate));

  // If no performance data, default to 50% (neutral)
  const effectiveBlueWinRate =
    blueTeam.some((p) => p.overallWinRate !== null) ? blueWinRate : 50;
  const effectiveOrangeWinRate =
    orangeTeam.some((p) => p.overallWinRate !== null) ? orangeWinRate : 50;

  // Win rate difference (max is 100)
  const winRateDiff = Math.abs(effectiveBlueWinRate - effectiveOrangeWinRate) / 100;

  return winRateDiff;
}

/**
 * Get detailed performance breakdown for debugging
 */
export function getPerformanceBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): {
  blue: { overallWinRate: number; recentWinRate: number; recentGoalDiff: number; playersWithData: number };
  orange: { overallWinRate: number; recentWinRate: number; recentGoalDiff: number; playersWithData: number };
  gaps: { overallWinRate: number; recentWinRate: number; recentGoalDiff: number };
} {
  // Overall stats (used for Performance scoring)
  const bluePlayersWithOverall = blueTeam.filter((p) => p.overallWinRate !== null).length;
  const orangePlayersWithOverall = orangeTeam.filter((p) => p.overallWinRate !== null).length;
  const blueOverallWinRate = averageNonNull(blueTeam.map((p) => p.overallWinRate));
  const orangeOverallWinRate = averageNonNull(orangeTeam.map((p) => p.overallWinRate));

  // Recent stats (for display, not used in Performance scoring - Form uses these)
  const blueRecentWinRate = averageNonNull(blueTeam.map((p) => p.recentWinRate));
  const orangeRecentWinRate = averageNonNull(orangeTeam.map((p) => p.recentWinRate));
  const blueRecentGoalDiff = averageNonNull(blueTeam.map((p) => p.recentGoalDiff));
  const orangeRecentGoalDiff = averageNonNull(orangeTeam.map((p) => p.recentGoalDiff));

  return {
    blue: {
      overallWinRate: bluePlayersWithOverall > 0 ? blueOverallWinRate : 50,
      recentWinRate: blueRecentWinRate,
      recentGoalDiff: blueRecentGoalDiff,
      playersWithData: bluePlayersWithOverall,
    },
    orange: {
      overallWinRate: orangePlayersWithOverall > 0 ? orangeOverallWinRate : 50,
      recentWinRate: orangeRecentWinRate,
      recentGoalDiff: orangeRecentGoalDiff,
      playersWithData: orangePlayersWithOverall,
    },
    gaps: {
      overallWinRate: Math.abs(
        (bluePlayersWithOverall > 0 ? blueOverallWinRate : 50) -
          (orangePlayersWithOverall > 0 ? orangeOverallWinRate : 50)
      ),
      recentWinRate: Math.abs(blueRecentWinRate - orangeRecentWinRate),
      recentGoalDiff: Math.abs(blueRecentGoalDiff - orangeRecentGoalDiff),
    },
  };
}
