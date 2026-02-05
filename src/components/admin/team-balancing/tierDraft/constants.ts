/**
 * Constants and configuration for the tier-based snake draft algorithm.
 *
 * Extracted from tierBasedSnakeDraft.ts for clarity and reusability.
 */

import { OptimizationWeights } from './types';

// ── Three-Layer Rating Weights ──────────────────────────────────────────

/** 60% base skills (Attack/Defense/Game IQ/GK - 15% each) */
export const WEIGHT_SKILL = 0.60;
/** 20% derived attributes from playstyles */
export const WEIGHT_ATTRIBUTES = 0.20;
/** 12% track record (career performance) */
export const WEIGHT_OVERALL = 0.12;
/** 8% current form (recent performance) */
export const WEIGHT_RECENT = 0.08;

// ── Goal Difference Normalization ───────────────────────────────────────

export const OVERALL_GD_MIN = -50;
export const OVERALL_GD_MAX = 50;
export const RECENT_GD_MIN = -20;
export const RECENT_GD_MAX = 20;

// ── Performance Weights ─────────────────────────────────────────────────

export const WIN_RATE_WEIGHT = 0.7;
export const GOAL_DIFF_WEIGHT = 0.3;

// ── General Thresholds ──────────────────────────────────────────────────

export const MIN_GAMES_FOR_STATS = 10;
export const BALANCE_THRESHOLD = 0.3;

// ── Soft Penalty Configuration ──────────────────────────────────────────

export const SOFT_PENALTY_CONFIG = {
  MINOR_VIOLATION: 1.0,
  MODERATE_VIOLATION: 1.5,
  SEVERE_VIOLATION: 2.0,
  CATASTROPHIC: 2.5,
  MINOR_PENALTY: 0.05,
  MODERATE_PENALTY: 0.15,
  SEVERE_PENALTY: 0.30,
} as const;

// ── Complementary Skill Pairing ─────────────────────────────────────────

export const PAIRING_CONFIG = {
  TIE_THRESHOLD: 0.10,
  GAME_IQ_SOFT_THRESHOLD: 0.30,
  GAME_IQ_PERFECT_GAP: 0.20,
} as const;

// ── Momentum ────────────────────────────────────────────────────────────

export const MOMENTUM_THRESHOLD_SMALL = 0.1;
export const MOMENTUM_THRESHOLD_LARGE = 0.3;
export const MOMENTUM_WEIGHT_HOT = 0.05;
export const MOMENTUM_WEIGHT_COLD = 0.03;
export const MOMENTUM_WEIGHT = 0.10;

// ── Default Multi-Objective Optimization Weights ────────────────────────

export const DEFAULT_WEIGHTS: OptimizationWeights = {
  skillsBalance: 0.18,
  shootingBalance: 0.08,
  attributeBalance: 0.09,
  tierFairness: 0.05,
  performanceGap: 0.08,
  coreSkillDominance: 0.12,
  systematicBias: 0.20,
  positionBalance: 0.08,
  avgRatingBalance: 0.07,
  chemistryBalance: 0.05,
};
