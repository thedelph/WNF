import type { BruteForcePlayer, MetricTierSkew } from '../types';

/**
 * Maximum acceptable gap for any single metric before penalty kicks in.
 * If any metric (attack, defense, gameIq, gk) exceeds this threshold,
 * an exponential penalty is applied to discourage heavily imbalanced teams.
 */
export const MAX_METRIC_GAP_THRESHOLD = 0.25;

/**
 * Calculate the average of a numeric array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate penalty for exceeding max metric gap threshold.
 * Uses exponential penalty to strongly discourage imbalanced single metrics.
 *
 * @param maxGap - The largest gap among all metrics
 * @param threshold - The acceptable threshold (default: 0.25)
 * @returns Penalty score (0 if under threshold, exponentially increasing above)
 */
function calculateMaxGapPenalty(maxGap: number, threshold: number = MAX_METRIC_GAP_THRESHOLD): number {
  if (maxGap <= threshold) return 0;

  // Exponential penalty: squared to strongly discourage exceeding threshold
  // Multiplier of 4 scales the overage before squaring for meaningful impact
  const overage = maxGap - threshold;
  return Math.pow(overage * 4, 2);
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

  // Find the maximum gap among all metrics
  const maxGap = Math.max(attackDiff, defenseDiff, gameIqDiff, gkDiff);

  // Calculate penalty if any single metric exceeds threshold
  const maxGapPenalty = calculateMaxGapPenalty(maxGap);

  // Average of all differences
  // Ratings are on 1-10 scale, so max diff is 9
  // Normalize to roughly 0-1 scale by dividing by 9
  const totalDiff = (attackDiff + defenseDiff + gameIqDiff + gkDiff) / 4;
  const baseScore = totalDiff / 9;

  // Return base score + penalty (penalty makes high-gap combinations uncompetitive)
  return baseScore + maxGapPenalty;
}

/**
 * Maximum tier skew allowed per metric before penalty kicks in.
 * Allows 1 player difference per metric between teams.
 */
export const MAX_TIER_SKEW = 1;

/**
 * Calculate penalty for per-metric tier imbalance.
 *
 * This prevents scenarios where one team gets all the top attackers
 * or all the top defenders, even if the overall ratings are balanced.
 *
 * @param blueTeam - Players on blue team
 * @param orangeTeam - Players on orange team
 * @param allPlayers - All players (for determining "top third" per metric)
 * @returns Total penalty and details per metric
 */
export function calculatePerMetricTierPenalty(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  allPlayers: BruteForcePlayer[]
): { totalPenalty: number; details: MetricTierSkew[] } {
  const metrics: Array<'attack' | 'defense' | 'gameIq' | 'gk'> = [
    'attack',
    'defense',
    'gameIq',
    'gk',
  ];
  const details: MetricTierSkew[] = [];
  let totalPenalty = 0;

  for (const metric of metrics) {
    // Sort all players by this specific metric to find "top third"
    const sorted = [...allPlayers].sort((a, b) => b[metric] - a[metric]);
    const topThirdSize = Math.ceil(sorted.length / 3);
    const topIds = new Set(sorted.slice(0, topThirdSize).map((p) => p.player_id));

    // Count how many top-tier players each team got for this metric
    const blueTopCount = blueTeam.filter((p) => topIds.has(p.player_id)).length;
    const orangeTopCount = orangeTeam.filter((p) => topIds.has(p.player_id)).length;
    const skew = Math.abs(blueTopCount - orangeTopCount);

    // Apply soft penalty for skew > MAX_TIER_SKEW
    // Squared to strongly discourage large skews
    const penalty =
      skew > MAX_TIER_SKEW ? Math.pow((skew - MAX_TIER_SKEW) * 0.1, 2) : 0;

    details.push({ metric, blueTopCount, orangeTopCount, skew, penalty });
    totalPenalty += penalty;
  }

  // Average the penalty across all metrics
  return { totalPenalty: totalPenalty / metrics.length, details };
}

/**
 * Core ratings breakdown with penalty information
 */
export interface CoreRatingsBreakdown {
  blue: { attack: number; defense: number; gameIq: number; gk: number };
  orange: { attack: number; defense: number; gameIq: number; gk: number };
  gaps: { attack: number; defense: number; gameIq: number; gk: number };
  maxGap: {
    metric: 'attack' | 'defense' | 'gameIq' | 'gk';
    value: number;
    exceedsThreshold: boolean;
    threshold: number;
  };
  penalty: {
    applied: boolean;
    amount: number;
  };
  // Per-metric tier penalty (if enabled)
  perMetricTierPenalty?: {
    applied: boolean;
    amount: number;
    details: MetricTierSkew[];
  };
}

/**
 * Get detailed breakdown of core ratings balance
 */
export function getCoreRatingsBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[]
): CoreRatingsBreakdown {
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

  const gaps = {
    attack: Math.abs(blue.attack - orange.attack),
    defense: Math.abs(blue.defense - orange.defense),
    gameIq: Math.abs(blue.gameIq - orange.gameIq),
    gk: Math.abs(blue.gk - orange.gk),
  };

  // Determine which metric has the largest gap
  const gapEntries: Array<{ metric: 'attack' | 'defense' | 'gameIq' | 'gk'; value: number }> = [
    { metric: 'attack', value: gaps.attack },
    { metric: 'defense', value: gaps.defense },
    { metric: 'gameIq', value: gaps.gameIq },
    { metric: 'gk', value: gaps.gk },
  ];
  const maxGapEntry = gapEntries.reduce((max, entry) => (entry.value > max.value ? entry : max));

  const exceedsThreshold = maxGapEntry.value > MAX_METRIC_GAP_THRESHOLD;
  const penaltyAmount = calculateMaxGapPenalty(maxGapEntry.value);

  return {
    blue,
    orange,
    gaps,
    maxGap: {
      metric: maxGapEntry.metric,
      value: maxGapEntry.value,
      exceedsThreshold,
      threshold: MAX_METRIC_GAP_THRESHOLD,
    },
    penalty: {
      applied: exceedsThreshold,
      amount: penaltyAmount,
    },
  };
}
