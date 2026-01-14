import type { BruteForcePlayer } from '../types';

/**
 * Calculate the form delta for a player (recent performance vs career baseline)
 * Positive = hot streak, Negative = cold streak
 */
function getFormDelta(player: BruteForcePlayer): number | null {
  if (player.recentWinRate === null || player.overallWinRate === null) {
    return null;
  }
  return player.recentWinRate - player.overallWinRate;
}

/**
 * Calculate the average form delta for a team
 * Returns the average deviation from baseline (positive = team on hot streak)
 */
function getTeamFormDelta(team: BruteForcePlayer[]): number {
  const deltas = team
    .map(getFormDelta)
    .filter((d): d is number => d !== null);

  if (deltas.length === 0) return 0;
  return deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
}

/**
 * Calculate the form balance score
 * Measures how evenly distributed hot/cold streaks are between teams
 *
 * The goal is to have similar average form deltas on each team,
 * so one team doesn't get all the players on hot streaks.
 *
 * Returns: A normalized score where 0 = perfect balance, higher = worse
 *          Range: 0 to 1 (where 1 = 100 percentage point difference)
 */
export function calculateFormScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): number {
  const blueFormDelta = getTeamFormDelta(blueTeam);
  const orangeFormDelta = getTeamFormDelta(orangeTeam);

  // Max possible difference is ~100 (one team all +50, other all -50)
  // Normalize to 0-1 scale
  const diff = Math.abs(blueFormDelta - orangeFormDelta);
  return diff / 100;
}

/**
 * Categorize a form delta into a streak type
 */
function getStreakType(delta: number): 'hot' | 'cold' | 'neutral' {
  if (delta >= 10) return 'hot';
  if (delta <= -10) return 'cold';
  return 'neutral';
}

/**
 * Get detailed form breakdown for debugging
 */
export function getFormBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): {
  blue: {
    avgFormDelta: number;
    playersWithData: number;
    hotStreakCount: number;
    coldStreakCount: number;
  };
  orange: {
    avgFormDelta: number;
    playersWithData: number;
    hotStreakCount: number;
    coldStreakCount: number;
  };
  gap: number;
  mostHotStreak: { name: string; delta: number; team: 'blue' | 'orange' } | null;
  mostColdStreak: { name: string; delta: number; team: 'blue' | 'orange' } | null;
  playerDeltas: Array<{
    name: string;
    team: 'blue' | 'orange';
    recent: number;
    overall: number;
    delta: number;
    streak: 'hot' | 'cold' | 'neutral';
  }>;
} {
  const allPlayerDeltas: Array<{
    name: string;
    team: 'blue' | 'orange';
    recent: number;
    overall: number;
    delta: number;
    streak: 'hot' | 'cold' | 'neutral';
  }> = [];

  // Process blue team
  let blueTotal = 0;
  let blueCount = 0;
  let blueHot = 0;
  let blueCold = 0;

  for (const p of blueTeam) {
    const delta = getFormDelta(p);
    if (delta !== null) {
      blueTotal += delta;
      blueCount++;
      const streak = getStreakType(delta);
      if (streak === 'hot') blueHot++;
      if (streak === 'cold') blueCold++;
      allPlayerDeltas.push({
        name: p.friendly_name,
        team: 'blue',
        recent: p.recentWinRate!,
        overall: p.overallWinRate!,
        delta,
        streak,
      });
    }
  }

  // Process orange team
  let orangeTotal = 0;
  let orangeCount = 0;
  let orangeHot = 0;
  let orangeCold = 0;

  for (const p of orangeTeam) {
    const delta = getFormDelta(p);
    if (delta !== null) {
      orangeTotal += delta;
      orangeCount++;
      const streak = getStreakType(delta);
      if (streak === 'hot') orangeHot++;
      if (streak === 'cold') orangeCold++;
      allPlayerDeltas.push({
        name: p.friendly_name,
        team: 'orange',
        recent: p.recentWinRate!,
        overall: p.overallWinRate!,
        delta,
        streak,
      });
    }
  }

  const blueAvg = blueCount > 0 ? blueTotal / blueCount : 0;
  const orangeAvg = orangeCount > 0 ? orangeTotal / orangeCount : 0;

  // Find most extreme streaks
  let mostHot: { name: string; delta: number; team: 'blue' | 'orange' } | null = null;
  let mostCold: { name: string; delta: number; team: 'blue' | 'orange' } | null = null;

  for (const pd of allPlayerDeltas) {
    if (mostHot === null || pd.delta > mostHot.delta) {
      mostHot = { name: pd.name, delta: pd.delta, team: pd.team };
    }
    if (mostCold === null || pd.delta < mostCold.delta) {
      mostCold = { name: pd.name, delta: pd.delta, team: pd.team };
    }
  }

  // Sort by delta descending (hottest first)
  allPlayerDeltas.sort((a, b) => b.delta - a.delta);

  return {
    blue: {
      avgFormDelta: blueAvg,
      playersWithData: blueCount,
      hotStreakCount: blueHot,
      coldStreakCount: blueCold,
    },
    orange: {
      avgFormDelta: orangeAvg,
      playersWithData: orangeCount,
      hotStreakCount: orangeHot,
      coldStreakCount: orangeCold,
    },
    gap: Math.abs(blueAvg - orangeAvg),
    mostHotStreak: mostHot && mostHot.delta >= 10 ? mostHot : null,
    mostColdStreak: mostCold && mostCold.delta <= -10 ? mostCold : null,
    playerDeltas: allPlayerDeltas,
  };
}
