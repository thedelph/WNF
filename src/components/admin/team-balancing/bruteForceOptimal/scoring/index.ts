import type { BruteForcePlayer, ChemistryMap, RivalryMap, TrioMap, ScoringWeights, ScoreBreakdown } from '../types';
import {
  calculateCoreRatingsScore,
  getCoreRatingsBreakdown,
  calculatePerMetricTierPenalty,
  MAX_METRIC_GAP_THRESHOLD,
  MAX_TIER_SKEW,
  type CoreRatingsBreakdown,
} from './coreRatingsScore';
import { calculateChemistryScore, getChemistryBreakdown } from './chemistryScore';
import { calculateRivalryScore, getRivalryBreakdown } from './rivalryScore';
import { calculateTrioScore, getTrioBreakdown } from './trioScore';
import { calculatePerformanceScore, getPerformanceBreakdown } from './performanceScore';
import { calculateFormScore, getFormBreakdown } from './formScore';
import { calculatePositionScore, getPositionBreakdown } from './positionScore';
import { calculateAttributeScore, getAttributeBreakdown } from './attributeScore';

// Re-export individual scorers
export {
  calculateCoreRatingsScore,
  getCoreRatingsBreakdown,
  calculatePerMetricTierPenalty,
  MAX_METRIC_GAP_THRESHOLD,
  MAX_TIER_SKEW,
  type CoreRatingsBreakdown,
  calculateChemistryScore,
  getChemistryBreakdown,
  calculateRivalryScore,
  getRivalryBreakdown,
  calculateTrioScore,
  getTrioBreakdown,
  calculatePerformanceScore,
  getPerformanceBreakdown,
  calculateFormScore,
  getFormBreakdown,
  calculatePositionScore,
  getPositionBreakdown,
  calculateAttributeScore,
  getAttributeBreakdown,
};

/**
 * Default scoring weights
 * Note: Performance (15%) + Form (5%) = 20% total for form-related factors
 */
export const WEIGHTS: ScoringWeights = {
  coreRatings: 0.40,
  chemistry: 0.20,
  performance: 0.15,
  form: 0.05,
  position: 0.10,
  attributes: 0.10,
};

/**
 * Internal chemistry component weights
 * These determine how the 20% chemistry weight is split between:
 * - Pairwise chemistry (same team synergy)
 * - Rivalry (cross-team matchup balance)
 * - Trio synergy (emergent 3-player effects)
 */
export const CHEMISTRY_INTERNAL_WEIGHTS = {
  pairwise: 0.50,  // 50% of chemistry = 10% of total
  rivalry: 0.30,   // 30% of chemistry = 6% of total
  trio: 0.20,      // 20% of chemistry = 4% of total
};

/**
 * Calculate the combined chemistry score including pairwise, rivalry, and trio
 */
function calculateCombinedChemistryScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  chemistryMap: ChemistryMap,
  rivalryMap: RivalryMap,
  trioMap: TrioMap
): { combined: number; pairwise: number; rivalry: number; trio: number } {
  const pairwiseScore = calculateChemistryScore(blueTeam, orangeTeam, chemistryMap);
  const rivalryScore = calculateRivalryScore(blueTeam, orangeTeam, rivalryMap);
  const trioScore = calculateTrioScore(blueTeam, orangeTeam, trioMap);

  const combined =
    pairwiseScore * CHEMISTRY_INTERNAL_WEIGHTS.pairwise +
    rivalryScore * CHEMISTRY_INTERNAL_WEIGHTS.rivalry +
    trioScore * CHEMISTRY_INTERNAL_WEIGHTS.trio;

  return { combined, pairwise: pairwiseScore, rivalry: rivalryScore, trio: trioScore };
}

/**
 * Options for score calculation
 */
export interface ScoreCalculationOptions {
  enablePerMetricTierPenalty?: boolean; // Default: true
}

/**
 * Calculate the total balance score for a team configuration
 *
 * @param blueTeam - Players on the blue team
 * @param orangeTeam - Players on the orange team
 * @param chemistryMap - Chemistry data for player pairs (same team)
 * @param rivalryMap - Rivalry data for player pairs (opposite teams)
 * @param trioMap - Trio chemistry data
 * @param weights - Optional custom weights (defaults to WEIGHTS)
 * @param allPlayers - All players (required for per-metric tier penalty)
 * @param options - Additional options
 *
 * @returns Total score where 0 = perfect balance, higher = worse
 */
export function calculateTotalScore(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  chemistryMap: ChemistryMap,
  rivalryMap: RivalryMap = new Map(),
  trioMap: TrioMap = new Map(),
  weights: ScoringWeights = WEIGHTS,
  allPlayers?: BruteForcePlayer[],
  options: ScoreCalculationOptions = {}
): number {
  const coreScore = calculateCoreRatingsScore(blueTeam, orangeTeam);
  const { combined: chemistryScore } = calculateCombinedChemistryScore(
    blueTeam,
    orangeTeam,
    chemistryMap,
    rivalryMap,
    trioMap
  );
  const performanceScore = calculatePerformanceScore(blueTeam, orangeTeam);
  const formScore = calculateFormScore(blueTeam, orangeTeam);
  const positionScore = calculatePositionScore(blueTeam, orangeTeam);
  const attributeScore = calculateAttributeScore(blueTeam, orangeTeam);

  // Calculate per-metric tier penalty if enabled and allPlayers provided
  const enablePerMetricTierPenalty = options.enablePerMetricTierPenalty !== false;
  let perMetricPenalty = 0;
  if (enablePerMetricTierPenalty && allPlayers) {
    const { totalPenalty } = calculatePerMetricTierPenalty(blueTeam, orangeTeam, allPlayers);
    perMetricPenalty = totalPenalty;
  }

  return (
    coreScore * weights.coreRatings +
    chemistryScore * weights.chemistry +
    performanceScore * weights.performance +
    formScore * weights.form +
    positionScore * weights.position +
    attributeScore * weights.attributes +
    perMetricPenalty // Added directly (not weighted) as a constraint penalty
  );
}

/**
 * Calculate the total score with a detailed breakdown
 */
export function calculateScoreWithBreakdown(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  chemistryMap: ChemistryMap,
  rivalryMap: RivalryMap = new Map(),
  trioMap: TrioMap = new Map(),
  weights: ScoringWeights = WEIGHTS,
  allPlayers?: BruteForcePlayer[],
  options: ScoreCalculationOptions = {}
): ScoreBreakdown {
  const coreScore = calculateCoreRatingsScore(blueTeam, orangeTeam);
  const chemistryDetails = calculateCombinedChemistryScore(
    blueTeam,
    orangeTeam,
    chemistryMap,
    rivalryMap,
    trioMap
  );
  const performanceScore = calculatePerformanceScore(blueTeam, orangeTeam);
  const formScore = calculateFormScore(blueTeam, orangeTeam);
  const positionScore = calculatePositionScore(blueTeam, orangeTeam);
  const attributeScore = calculateAttributeScore(blueTeam, orangeTeam);

  // Calculate per-metric tier penalty if enabled and allPlayers provided
  const enablePerMetricTierPenalty = options.enablePerMetricTierPenalty !== false;
  let perMetricPenalty = 0;
  if (enablePerMetricTierPenalty && allPlayers) {
    const { totalPenalty } = calculatePerMetricTierPenalty(blueTeam, orangeTeam, allPlayers);
    perMetricPenalty = totalPenalty;
  }

  const total =
    coreScore * weights.coreRatings +
    chemistryDetails.combined * weights.chemistry +
    performanceScore * weights.performance +
    formScore * weights.form +
    positionScore * weights.position +
    attributeScore * weights.attributes +
    perMetricPenalty;

  return {
    coreRatings: coreScore,
    chemistry: chemistryDetails.combined,
    chemistryDetails: {
      pairwise: chemistryDetails.pairwise,
      rivalry: chemistryDetails.rivalry,
      trio: chemistryDetails.trio,
    },
    performance: performanceScore,
    form: formScore,
    position: positionScore,
    attributes: attributeScore,
    total,
  };
}
