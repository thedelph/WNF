/**
 * Tier-Based Snake Draft Algorithm
 *
 * This module implements a multi-objective team balancing algorithm that:
 * 1. Rates players using a three-layer system (skills + attributes + performance)
 * 2. Groups players into skill tiers
 * 3. Applies snake draft for initial assignment
 * 4. Optimizes via iterative same-tier and cross-tier swaps
 * 5. Runs post-optimization validation and fixes
 *
 * Module structure:
 * - types.ts      → All interfaces and type definitions
 * - constants.ts  → Configuration constants and weights
 * - ../tierBasedSnakeDraft.ts → Algorithm implementation (to be further split)
 */

// Re-export all public types
export type {
  PlayerWithRating,
  TierInfo,
  MultiObjectiveScore,
  OptimizationWeights,
  SwapEvaluation,
  SwapPair,
  TierBasedResult,
  TierBasedOptions,
} from './types';

// Re-export constants
export { DEFAULT_WEIGHTS } from './constants';

// Re-export the main algorithm function
export { findTierBasedTeamBalance } from '../tierBasedSnakeDraft';
