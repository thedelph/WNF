/**
 * Type definitions for the tier-based snake draft algorithm.
 *
 * Extracted from tierBasedSnakeDraft.ts for reusability and clarity.
 */

import { TeamAssignment } from '../types';
import { Position, PositionConsensus } from '../../../../types/positions';

// ── Core Player & Tier Types ────────────────────────────────────────────

export interface PlayerWithRating extends TeamAssignment {
  threeLayerRating: number;
  baseSkillRating: number;
  attributesScore?: number;
  attributesAdjustment?: number;
  hasPlaystyleRating?: boolean;
  overallPerformanceScore?: number;
  recentFormScore?: number;
  momentumScore?: number;
  momentumCategory?: 'hot' | 'cold' | 'steady';
  momentumAdjustment?: number;
  tier?: number;
  positions?: PositionConsensus[];
  primaryPosition?: Position | null;
}

export interface TierInfo {
  tierNumber: number;
  players: PlayerWithRating[];
  skillRange: { min: number; max: number };
}

// ── Scoring & Optimization Types ────────────────────────────────────────

export interface MultiObjectiveScore {
  skillsBalance: number;
  shootingBalance: number;
  attributeBalance: number;
  tierFairness: number;
  performanceGap: number;
  coreSkillDominance: number;
  systematicBias: number;
  positionBalance: number;
  avgRatingBalance: number;
  chemistryBalance: number;
  overall: number;
}

export interface OptimizationWeights {
  skillsBalance: number;
  shootingBalance: number;
  attributeBalance: number;
  tierFairness: number;
  performanceGap: number;
  coreSkillDominance: number;
  systematicBias: number;
  positionBalance: number;
  avgRatingBalance: number;
  chemistryBalance: number;
}

export interface SwapEvaluation {
  isImprovement: boolean;
  improvedObjectives: string[];
  worsenedObjectives: string[];
  scoreBefore: MultiObjectiveScore;
  scoreAfter: MultiObjectiveScore;
  netImprovement: number;
}

export interface SwapPair {
  swap1: {
    tier: number;
    teamA: 'blue' | 'orange';
    playerA: PlayerWithRating;
    teamB: 'blue' | 'orange';
    playerB: PlayerWithRating;
  };
  swap2: {
    tier: number;
    teamA: 'blue' | 'orange';
    playerA: PlayerWithRating;
    teamB: 'blue' | 'orange';
    playerB: PlayerWithRating;
  };
  combinedImprovement: number;
  scoreBefore: MultiObjectiveScore;
  scoreAfter: MultiObjectiveScore;
  evaluation: SwapEvaluation;
  priority: number;
}

// ── Result Types ────────────────────────────────────────────────────────

export interface TierBasedResult {
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
  tiers: TierInfo[];
  initialScore: number;
  optimizedScore: number;
  wasOptimized: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceMessage: string;
  debugLog?: string;
}

export interface TierBasedOptions {
  permanentGKIds?: string[];
  chemistryLookup?: Map<string, number>;
}

// ── Internal Types ──────────────────────────────────────────────────────
// Note: Internal types (ShootingDistribution, BalanceScoreDetails, etc.)
// remain in tierBasedSnakeDraft.ts as they are tightly coupled to the
// algorithm implementation. They will be extracted in a future iteration.

export interface ComplementaryPairingResult {
  isPaired: boolean;
  attackWinner: 'blue' | 'orange' | 'tie';
  defenseWinner: 'blue' | 'orange' | 'tie';
  gameIqWinner: 'blue' | 'orange' | 'tie';
  gameIqGap: number;
  isGameIqAcceptable: boolean;
  pairingStatus: 'perfect' | 'acceptable' | 'violated';
  reason: string;
  blueAttack: number;
  orangeAttack: number;
  blueDefense: number;
  orangeDefense: number;
  blueGameIq: number;
  orangeGameIq: number;
}
