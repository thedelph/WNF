import { TeamAssignment } from './types';
import { calculateBalanceScore } from '../../../utils/teamBalancing';
import { attachPrimaryPositions, evaluateSwapPositionImpact, logPositionBalanceStatus, checkIndividualPositionBalance, PlayerWithPositions } from '../../../utils/positionBalancing';
import { comparePositionBalance } from '../../../utils/positionClassifier';
import { Position, PositionConsensus } from '../../../types/positions';

// Configuration constants for the three-layer system
const WEIGHT_SKILL = 0.60;      // 60% base skills (Attack/Defense/Game IQ/GK - 15% each)
const WEIGHT_ATTRIBUTES = 0.20; // 20% derived attributes from playstyles
const WEIGHT_OVERALL = 0.12;    // 12% track record (career performance)
const WEIGHT_RECENT = 0.08;     // 8% current form (recent performance)

// Goal difference normalization ranges
const OVERALL_GD_MIN = -50;
const OVERALL_GD_MAX = 50;
const RECENT_GD_MIN = -20;
const RECENT_GD_MAX = 20;

// Win rate and goal diff balance within performance scores
const WIN_RATE_WEIGHT = 0.7;
const GOAL_DIFF_WEIGHT = 0.3;

// Other constants
const MIN_GAMES_FOR_STATS = 10;
const BALANCE_THRESHOLD = 0.3;

// Soft penalty configuration - replaces hard rejections with graduated penalties
const SOFT_PENALTY_CONFIG = {
  // Threshold multipliers for penalty levels
  MINOR_VIOLATION: 1.0,    // 100% of threshold = minor penalty
  MODERATE_VIOLATION: 1.5, // 150% of threshold = moderate penalty
  SEVERE_VIOLATION: 2.0,   // 200% of threshold = severe penalty (still considered)
  CATASTROPHIC: 2.5,       // 250%+ = hard reject (truly catastrophic)

  // Penalty weights applied to swap score
  MINOR_PENALTY: 0.05,     // Small penalty, swap likely still accepted
  MODERATE_PENALTY: 0.15,  // Medium penalty, need good improvement to accept
  SEVERE_PENALTY: 0.30,    // Large penalty, need excellent improvement
};

// Complementary skill pairing configuration
// Enforces that Attack and Defense advantages are on opposite teams
const PAIRING_CONFIG = {
  TIE_THRESHOLD: 0.10,          // Skills within 0.1 = tie (no winner)
  GAME_IQ_SOFT_THRESHOLD: 0.30, // Soft preference - flag in debug if exceeded
  GAME_IQ_PERFECT_GAP: 0.20,    // Gap for "perfect" pairing status
  // Note: Game IQ is NOT a hard constraint, only ATK↔DEF pairing is enforced
};

/**
 * Result of complementary skill pairing check
 * Used to ensure Attack and Defense advantages are on opposite teams
 */
interface ComplementaryPairingResult {
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

/**
 * Check if Attack and Defense skills are complementary (won by opposite teams)
 * This ensures tactical balance: if one team can score better, the other should defend better
 *
 * Pairing rules:
 * - 'perfect': ATK↔DEF properly paired (opposite teams) AND Game IQ gap ≤ 0.2
 * - 'acceptable': ATK↔DEF properly paired OR either is a tie
 * - 'violated': Same team wins BOTH ATK and DEF (neither is a tie)
 *
 * Note: Game IQ is a soft preference only - flagged but not enforced
 */
function checkComplementarySkillPairing(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> = new Set()
): ComplementaryPairingResult {
  // Filter out permanent GKs for Attack/Defense calculation (they don't play outfield)
  const blueOutfield = blueTeam.filter(p => !permanentGKIds.has(p.player_id));
  const orangeOutfield = orangeTeam.filter(p => !permanentGKIds.has(p.player_id));

  // Handle empty teams
  if (blueOutfield.length === 0 || orangeOutfield.length === 0) {
    return {
      isPaired: true,
      attackWinner: 'tie',
      defenseWinner: 'tie',
      gameIqWinner: 'tie',
      gameIqGap: 0,
      isGameIqAcceptable: true,
      pairingStatus: 'acceptable',
      reason: 'Empty team - cannot evaluate pairing',
      blueAttack: 0,
      orangeAttack: 0,
      blueDefense: 0,
      orangeDefense: 0,
      blueGameIq: 0,
      orangeGameIq: 0,
    };
  }

  // Calculate average Attack (outfield only)
  const blueAttack = blueOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueOutfield.length;
  const orangeAttack = orangeOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeOutfield.length;

  // Calculate average Defense (outfield only)
  const blueDefense = blueOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueOutfield.length;
  const orangeDefense = orangeOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeOutfield.length;

  // Calculate average Game IQ (include all players - IQ matters for everyone)
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  // Determine winners using tie threshold
  const attackDiff = blueAttack - orangeAttack;
  const defenseDiff = blueDefense - orangeDefense;
  const gameIqDiff = blueGameIq - orangeGameIq;
  const gameIqGap = Math.abs(gameIqDiff);

  const attackWinner: 'blue' | 'orange' | 'tie' =
    attackDiff > PAIRING_CONFIG.TIE_THRESHOLD ? 'blue' :
    attackDiff < -PAIRING_CONFIG.TIE_THRESHOLD ? 'orange' : 'tie';

  const defenseWinner: 'blue' | 'orange' | 'tie' =
    defenseDiff > PAIRING_CONFIG.TIE_THRESHOLD ? 'blue' :
    defenseDiff < -PAIRING_CONFIG.TIE_THRESHOLD ? 'orange' : 'tie';

  const gameIqWinner: 'blue' | 'orange' | 'tie' =
    gameIqDiff > PAIRING_CONFIG.TIE_THRESHOLD ? 'blue' :
    gameIqDiff < -PAIRING_CONFIG.TIE_THRESHOLD ? 'orange' : 'tie';

  // Check if ATK↔DEF are properly paired (opposite teams or either is a tie)
  const isPaired =
    (attackWinner === 'blue' && defenseWinner === 'orange') ||
    (attackWinner === 'orange' && defenseWinner === 'blue') ||
    (attackWinner === 'tie' || defenseWinner === 'tie');

  // Game IQ is soft preference only
  const isGameIqAcceptable = gameIqGap <= PAIRING_CONFIG.GAME_IQ_SOFT_THRESHOLD;

  // Determine pairing status
  let pairingStatus: 'perfect' | 'acceptable' | 'violated';
  let reason: string;

  if (!isPaired) {
    // Same team wins both ATK and DEF (neither is a tie) - VIOLATED
    pairingStatus = 'violated';
    const dominantTeam = attackWinner; // Same as defenseWinner since both must match
    reason = `${dominantTeam === 'blue' ? 'Blue' : 'Orange'} wins BOTH Attack (${attackDiff > 0 ? '+' : ''}${attackDiff.toFixed(2)}) and Defense (${defenseDiff > 0 ? '+' : ''}${defenseDiff.toFixed(2)}) - not tactically balanced`;
  } else if (gameIqGap <= PAIRING_CONFIG.GAME_IQ_PERFECT_GAP) {
    // Properly paired AND Game IQ is very close
    pairingStatus = 'perfect';
    reason = `ATK↔DEF properly paired, Game IQ gap ${gameIqGap.toFixed(2)} ≤ ${PAIRING_CONFIG.GAME_IQ_PERFECT_GAP}`;
  } else {
    // Properly paired but Game IQ gap is larger (still acceptable)
    pairingStatus = 'acceptable';
    if (attackWinner === 'tie' && defenseWinner === 'tie') {
      reason = `Both ATK and DEF are tied (within ${PAIRING_CONFIG.TIE_THRESHOLD})`;
    } else if (attackWinner === 'tie') {
      reason = `ATK is tied, ${defenseWinner === 'blue' ? 'Blue' : 'Orange'} wins DEF`;
    } else if (defenseWinner === 'tie') {
      reason = `${attackWinner === 'blue' ? 'Blue' : 'Orange'} wins ATK, DEF is tied`;
    } else {
      reason = `${attackWinner === 'blue' ? 'Blue' : 'Orange'} wins ATK, ${defenseWinner === 'blue' ? 'Blue' : 'Orange'} wins DEF - properly paired`;
    }
    if (gameIqGap > PAIRING_CONFIG.GAME_IQ_SOFT_THRESHOLD) {
      reason += ` (Game IQ gap ${gameIqGap.toFixed(2)} exceeds soft threshold)`;
    }
  }

  return {
    isPaired,
    attackWinner,
    defenseWinner,
    gameIqWinner,
    gameIqGap,
    isGameIqAcceptable,
    pairingStatus,
    reason,
    blueAttack,
    orangeAttack,
    blueDefense,
    orangeDefense,
    blueGameIq,
    orangeGameIq,
  };
}

/**
 * Calculate soft penalty for attribute threshold violations
 * Instead of hard rejection, returns a penalty value to add to swap score
 * Returns { penalty: number, rejected: boolean, reason: string }
 */
function calculateSoftPenalty(
  attributeBalance: number,
  threshold: number,
  context: string = 'swap'
): { penalty: number; rejected: boolean; reason: string; severity: string } {
  if (attributeBalance <= threshold) {
    return { penalty: 0, rejected: false, reason: '', severity: 'none' };
  }

  const ratio = attributeBalance / threshold;
  const excess = attributeBalance - threshold;

  if (ratio >= SOFT_PENALTY_CONFIG.CATASTROPHIC) {
    // Truly catastrophic - hard reject
    return {
      penalty: 1.0,
      rejected: true,
      reason: `HARD REJECT: Attribute balance ${attributeBalance.toFixed(2)} is ${ratio.toFixed(1)}x threshold (catastrophic)`,
      severity: 'catastrophic'
    };
  } else if (ratio >= SOFT_PENALTY_CONFIG.SEVERE_VIOLATION) {
    return {
      penalty: SOFT_PENALTY_CONFIG.SEVERE_PENALTY * (ratio - 1),
      rejected: false,
      reason: `SEVERE: +${excess.toFixed(2)} over threshold (${ratio.toFixed(1)}x), penalty=${(SOFT_PENALTY_CONFIG.SEVERE_PENALTY * (ratio - 1)).toFixed(3)}`,
      severity: 'severe'
    };
  } else if (ratio >= SOFT_PENALTY_CONFIG.MODERATE_VIOLATION) {
    return {
      penalty: SOFT_PENALTY_CONFIG.MODERATE_PENALTY * (ratio - 1),
      rejected: false,
      reason: `MODERATE: +${excess.toFixed(2)} over threshold (${ratio.toFixed(1)}x), penalty=${(SOFT_PENALTY_CONFIG.MODERATE_PENALTY * (ratio - 1)).toFixed(3)}`,
      severity: 'moderate'
    };
  } else {
    return {
      penalty: SOFT_PENALTY_CONFIG.MINOR_PENALTY * (ratio - 1),
      rejected: false,
      reason: `MINOR: +${excess.toFixed(2)} over threshold (${ratio.toFixed(1)}x), penalty=${(SOFT_PENALTY_CONFIG.MINOR_PENALTY * (ratio - 1)).toFixed(3)}`,
      severity: 'minor'
    };
  }
}

/**
 * Calculate draft bias score for a team configuration (simplified version for draft decisions)
 * Measures how "one-sided" the skill distribution is
 * Returns 0 for perfectly balanced (2-2 skill wins), up to 1 for total dominance (4-0)
 * Note: Different from calculateSystematicBias() which is more comprehensive and used in optimization
 */
function calculateDraftBias(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[]
): { bias: number; blueWins: number; orangeWins: number; details: string } {
  if (blueTeam.length === 0 || orangeTeam.length === 0) {
    return { bias: 0, blueWins: 0, orangeWins: 0, details: 'Empty team' };
  }

  // Calculate averages for each skill
  const blueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
  const orangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;

  const blueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
  const orangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;

  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  const blueGk = blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;
  const orangeGk = orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  // Count wins (who has better average in each skill)
  let blueWins = 0;
  let orangeWins = 0;
  const winDetails: string[] = [];

  if (blueAttack > orangeAttack + 0.05) { blueWins++; winDetails.push('Atk:B'); }
  else if (orangeAttack > blueAttack + 0.05) { orangeWins++; winDetails.push('Atk:O'); }
  else { winDetails.push('Atk:='); }

  if (blueDefense > orangeDefense + 0.05) { blueWins++; winDetails.push('Def:B'); }
  else if (orangeDefense > blueDefense + 0.05) { orangeWins++; winDetails.push('Def:O'); }
  else { winDetails.push('Def:='); }

  if (blueGameIq > orangeGameIq + 0.05) { blueWins++; winDetails.push('IQ:B'); }
  else if (orangeGameIq > blueGameIq + 0.05) { orangeWins++; winDetails.push('IQ:O'); }
  else { winDetails.push('IQ:='); }

  if (blueGk > orangeGk + 0.05) { blueWins++; winDetails.push('GK:B'); }
  else if (orangeGk > blueGk + 0.05) { orangeWins++; winDetails.push('GK:O'); }
  else { winDetails.push('GK:='); }

  // Calculate bias: 0 = balanced (2-2), 1 = total dominance (4-0)
  const totalWins = blueWins + orangeWins;
  const maxWins = Math.max(blueWins, orangeWins);
  const bias = totalWins > 0 ? (maxWins - totalWins / 2) / (totalWins / 2) : 0;

  return {
    bias: Math.min(bias, 1.0),
    blueWins,
    orangeWins,
    details: `${blueWins}-${orangeWins} (${winDetails.join(', ')})`
  };
}

/**
 * Evaluate which team assignment for a player would result in better systematic bias
 * Used during snake draft to prevent metric dominance from forming
 */
function evaluateDraftAssignment(
  player: PlayerWithRating,
  currentBlueTeam: PlayerWithRating[],
  currentOrangeTeam: PlayerWithRating[]
): { preferBlue: boolean; blueScore: number; orangeScore: number; reason: string } {
  // Try adding player to blue
  const blueWithPlayer = [...currentBlueTeam, player];
  const blueAssignBias = calculateDraftBias(blueWithPlayer, currentOrangeTeam);

  // Try adding player to orange
  const orangeWithPlayer = [...currentOrangeTeam, player];
  const orangeAssignBias = calculateDraftBias(currentBlueTeam, orangeWithPlayer);

  // Lower bias is better (more balanced)
  const preferBlue = blueAssignBias.bias <= orangeAssignBias.bias;

  return {
    preferBlue,
    blueScore: blueAssignBias.bias,
    orangeScore: orangeAssignBias.bias,
    reason: `Blue→${blueAssignBias.details} (bias:${blueAssignBias.bias.toFixed(2)}), Orange→${orangeAssignBias.details} (bias:${orangeAssignBias.bias.toFixed(2)})`
  };
}

// Dynamic attribute balance threshold based on multiple factors
// More lenient for swaps that provide significant improvement or when teams are already imbalanced
const getAttributeBalanceThreshold = (
  improvement: number,
  currentBalance: number = 1.0,
  failedAttempts: number = 0,
  winRateGapBefore: number = 0,
  winRateGapAfter: number = 0
): number => {
  let baseThreshold: number;

  // Base thresholds based on improvement magnitude
  if (improvement > 0.3) {
    baseThreshold = 2.5;  // Very lenient for huge improvements
  } else if (improvement > 0.2) {
    baseThreshold = 2.0;  // Lenient for big improvements
  } else if (improvement > 0.1) {
    baseThreshold = 1.5;  // Moderately lenient
  } else if (improvement > 0.05) {
    baseThreshold = 1.0;  // Slightly lenient
  } else {
    baseThreshold = 0.7;  // Strict for minimal improvements
  }

  // Adjust based on current balance - be more lenient if teams are already poor
  if (currentBalance > 1.0) {
    // Teams are already imbalanced, be more lenient to allow fixes
    baseThreshold *= (1 + (currentBalance - 1) * 0.3); // Up to 30% more lenient per unit of imbalance
  }

  // Progressive relaxation based on failed attempts
  // IMPROVED: Kick in earlier and more aggressively to escape local optima
  if (failedAttempts > 15) {
    baseThreshold *= 2.5; // 150% more lenient after 15 failures
  } else if (failedAttempts > 8) {
    baseThreshold *= 1.8; // 80% more lenient after 8 failures
  } else if (failedAttempts > 3) {
    baseThreshold *= 1.4; // 40% more lenient after just 3 failures
  }

  // Only penalize if win rate gap worsens significantly
  if (winRateGapAfter > 15 && winRateGapAfter > winRateGapBefore * 1.5) {
    baseThreshold *= 0.8; // Make threshold 20% stricter
  }

  return baseThreshold;
};

// Momentum constants
const MOMENTUM_THRESHOLD_SMALL = 0.1;   // Below this, no momentum effect
const MOMENTUM_THRESHOLD_LARGE = 0.3;   // Above this, maximum momentum effect
const MOMENTUM_WEIGHT_HOT = 0.05;       // 5% bonus for hot streaks (reduced from 10%)
const MOMENTUM_WEIGHT_COLD = 0.03;      // 3% penalty for cold streaks (reduced from 5%)
const MOMENTUM_WEIGHT = 0.10;           // Overall momentum contribution (reduced from 15%)

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

// Multi-Objective Optimization Interfaces
export interface MultiObjectiveScore {
  skillsBalance: number;      // Max difference in Attack/Defense/Game IQ/GK (lower is better)
  shootingBalance: number;    // Shooting distribution imbalance score (lower is better)
  attributeBalance: number;   // Average difference in 6 derived attributes (lower is better)
  tierFairness: number;       // Tier distribution variance + quality concentration (lower is better)
  performanceGap: number;     // Combined win rate + goal differential gap (lower is better)
  coreSkillDominance: number; // Penalty when one team wins 0/3 core skills (lower is better) - Jan 2026
  systematicBias: number;     // Cross-category dominance penalty (lower is better)
  positionBalance: number;    // Position distribution balance (lower is better) - prevents striker imbalance
  avgRatingBalance: number;   // Average three-layer rating difference (lower is better)
  chemistryBalance: number;   // Team chemistry balance (lower is better) - Dec 2025
  overall: number;            // Weighted combination of all objectives (lower is better)
}

export interface OptimizationWeights {
  skillsBalance: number;      // Default: 0.18
  shootingBalance: number;    // Default: 0.08
  attributeBalance: number;   // Default: 0.10
  tierFairness: number;       // Default: 0.05
  performanceGap: number;     // Default: 0.08
  coreSkillDominance: number; // Default: 0.12 - Jan 2026: Penalty for core skill domination
  systematicBias: number;     // Default: 0.22
  positionBalance: number;    // Default: 0.09
  avgRatingBalance: number;   // Default: 0.07
  chemistryBalance: number;   // Default: 0.10 - Dec 2025: Balance team chemistry
}

export interface SwapEvaluation {
  isImprovement: boolean;
  improvedObjectives: string[];
  worsenedObjectives: string[];
  scoreBefore: MultiObjectiveScore;
  scoreAfter: MultiObjectiveScore;
  netImprovement: number;
}

// Default weights for multi-objective optimization
// Priority: Systematic Bias > Core Skill Dominance > Skills > Position Balance > Attributes > Chemistry > Avg Rating
// Jan 2026 Update: Added coreSkillDominance (12%) to ensure SA finds solutions where each team wins at least 1 core skill
const DEFAULT_WEIGHTS: OptimizationWeights = {
  skillsBalance: 0.18,        // Attack/Defense/Game IQ balance (reduced from 0.20)
  shootingBalance: 0.08,      // Shooting distribution
  attributeBalance: 0.09,     // Pace, passing, etc. (reduced from 0.11)
  tierFairness: 0.05,         // Only care about top 4 / bottom 4 split
  performanceGap: 0.08,       // Win rate gap
  coreSkillDominance: 0.12,   // NEW Jan 2026: Penalty when one team wins 0/3 core skills
  systematicBias: 0.20,       // Heavily penalize one team dominating all categories (reduced from 0.22)
  positionBalance: 0.08,      // Position balance to prevent striker imbalance (reduced from 0.09)
  avgRatingBalance: 0.07,     // Average three-layer rating difference
  chemistryBalance: 0.05,     // Intra-team chemistry balance (reduced from 0.10)
};

// Phase 4: Multi-Swap Combinations Interface
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
  priority: number; // Higher is better
}

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

/**
 * Calculate dynamic balance threshold based on team size and rating ranges
 */
function calculateDynamicBalanceThreshold(teamSize: number, ratingRange: { min: number; max: number }): number {
  // Base threshold scales with team size (smaller teams need stricter balance)
  const sizeBasedThreshold = Math.max(0.15, 0.5 / Math.sqrt(teamSize));
  
  // Rating range factor (wider ranges allow slightly higher thresholds)
  const rangeFactor = Math.min(1.5, (ratingRange.max - ratingRange.min) / 3);
  
  // Combine factors with reasonable bounds
  const dynamicThreshold = sizeBasedThreshold * rangeFactor;
  
  // Ensure threshold stays within reasonable bounds (0.15 to 0.5)
  return Math.max(0.15, Math.min(0.5, dynamicThreshold));
}

/**
 * Generate context-aware balance quality description
 */
function generateBalanceQualityDescription(
  finalScore: number, 
  balanceThreshold: number,
  metrics: {
    attackDiff: number;
    defenseDiff: number; 
    gameIqDiff: number;
    attributeDiff?: number;
    winRateDiff?: number;
    goalDiffDiff?: number;
  }
): string {
  const { attackDiff, defenseDiff, gameIqDiff, attributeDiff, winRateDiff, goalDiffDiff } = metrics;
  
  // Identify problematic areas (> 0.5 difference is significant)
  const issues: string[] = [];
  if (attackDiff > 0.5) issues.push('attack imbalance');
  if (defenseDiff > 0.5) issues.push('defense imbalance');
  if (gameIqDiff > 0.5) issues.push('game IQ imbalance');
  if (attributeDiff && attributeDiff > 0.5) issues.push('attribute imbalance');
  if (winRateDiff && winRateDiff > 5) issues.push('win rate gap');
  if (goalDiffDiff && goalDiffDiff > 3) issues.push('goal differential gap');
  
  // Determine base quality level using dynamic threshold
  let baseDescription: string;
  if (finalScore <= balanceThreshold * 0.7) {
    baseDescription = 'Excellent balance';
  } else if (finalScore <= balanceThreshold) {
    baseDescription = 'Good balance';
  } else if (finalScore <= balanceThreshold * 2) {
    baseDescription = 'Fair balance';
  } else {
    baseDescription = 'Poor balance';
  }
  
  // Add context about specific issues
  if (issues.length === 0) {
    return `${baseDescription} across all metrics`;
  } else if (issues.length === 1) {
    return `${baseDescription} with ${issues[0]}`;
  } else if (issues.length === 2) {
    return `${baseDescription} with ${issues.join(' and ')}`;
  } else {
    return `${baseDescription} with multiple imbalances (${issues.slice(0, 2).join(', ')}, others)`;
  }
}

/**
 * Calculate league average attributes and standard deviation for relative comparisons
 */
/**
 * Calculate goal differential statistics from the actual player pool
 */
function calculateGoalDiffStats(players: TeamAssignment[]): {
  overallMin: number;
  overallMax: number;
  recentMin: number;
  recentMax: number;
} {
  const playersWithStats = players.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS);

  if (playersWithStats.length === 0) {
    // Fallback to hardcoded values if no experienced players
    return {
      overallMin: OVERALL_GD_MIN,
      overallMax: OVERALL_GD_MAX,
      recentMin: RECENT_GD_MIN,
      recentMax: RECENT_GD_MAX
    };
  }

  const overallGDs = playersWithStats.map(p => p.overall_goal_differential ?? 0);
  const recentGDs = playersWithStats.map(p => p.goal_differential ?? 0);

  return {
    overallMin: Math.min(...overallGDs),
    overallMax: Math.max(...overallGDs),
    recentMin: Math.min(...recentGDs),
    recentMax: Math.max(...recentGDs)
  };
}

function calculateLeagueAttributeStats(players: TeamAssignment[]): {
  average: number;
  standardDeviation: number;
  min: number;
  max: number;
} {
  const playersWithAttributes = players.filter(p => p.derived_attributes);

  if (playersWithAttributes.length === 0) {
    return {
      average: 5.0, // Default neutral attribute score
      standardDeviation: 1.0,
      min: 5.0,
      max: 5.0
    };
  }

  // Calculate all attribute scores
  // With new system, each attribute is 0-1, and players can have 0-6 total
  const attributeScores = playersWithAttributes.map(player => {
    const attrs = player.derived_attributes!;
    // Sum total attribute points (0-6 range) and normalize to 0-10 scale
    const totalAttributePoints =
      attrs.pace +
      attrs.shooting +
      attrs.passing +
      attrs.dribbling +
      attrs.defending +
      attrs.physical;

    // Normalize: 0 attributes = 0, 6 attributes = 10
    return (totalAttributePoints / 6) * 10;
  });

  // Calculate statistics
  const average = attributeScores.reduce((sum, score) => sum + score, 0) / attributeScores.length;
  const min = Math.min(...attributeScores);
  const max = Math.max(...attributeScores);

  // Calculate standard deviation
  const variance = attributeScores.reduce((sum, score) => {
    return sum + Math.pow(score - average, 2);
  }, 0) / attributeScores.length;
  const standardDeviation = Math.sqrt(variance);

  return { average, standardDeviation, min, max };
}

/**
 * Calculate the three-layer rating for a player
 * Combines base skill, overall performance, and recent form
 */
/**
 * Calculates rating for permanent goalkeepers (players staying in goal for full game)
 * Formula: GK 70%, Game IQ 20%, Performance 10%
 * Ignores Attack, Defense, and Playstyle Attributes since they won't play outfield
 */
function calculatePermanentGKRating(
  player: TeamAssignment,
  goalDiffStats: { overallMin: number; overallMax: number; recentMin: number; recentMax: number }
): {
  threeLayerRating: number;
  baseSkillRating: number;
  overallPerformanceScore?: number;
  recentFormScore?: number;
} {
  // Primary skill: GK ability (70% weight)
  const gkRating = player.gk_rating ?? 5;

  // Secondary skill: Game IQ for positioning/distribution (20% weight)
  const gameIqRating = player.game_iq_rating ?? 5;

  // Base rating: weighted average of GK (70%) and Game IQ (20%) = 90%
  const baseSkillRating = (gkRating * 0.70) + (gameIqRating * 0.20);

  // Performance component (10% total): reliability factor
  let overallWinRate, overallGoalDiff, recentWinRate, recentGoalDiff;

  if (!player.total_games || player.total_games < MIN_GAMES_FOR_STATS) {
    overallWinRate = 0.5;
    overallGoalDiff = 0;
    recentWinRate = 0.5;
    recentGoalDiff = 0;
  } else {
    overallWinRate = player.overall_win_rate ?? 0.5;
    overallGoalDiff = player.overall_goal_differential ?? 0;
    recentWinRate = player.win_rate ?? 0.5;
    recentGoalDiff = player.goal_differential ?? 0;
  }

  // Convert percentages to decimals
  if (overallWinRate > 1) overallWinRate = overallWinRate / 100;
  if (recentWinRate > 1) recentWinRate = recentWinRate / 100;

  // Normalize goal differentials
  const gdRange = Math.max(1, goalDiffStats.overallMax - goalDiffStats.overallMin);
  const overallGdNorm = Math.max(0, Math.min(1,
    (overallGoalDiff - goalDiffStats.overallMin) / gdRange
  ));

  const recentGdRange = Math.max(1, goalDiffStats.recentMax - goalDiffStats.recentMin);
  const recentGdNorm = Math.max(0, Math.min(1,
    (recentGoalDiff - goalDiffStats.recentMin) / recentGdRange
  ));

  // Performance scores (centered around 0.5)
  const overallPerformanceScore = (overallWinRate + overallGdNorm) / 2;
  const recentFormScore = (recentWinRate + recentGdNorm) / 2;

  // Performance adjustment: 5% overall, 5% recent = 10% total
  const overallAdjustment = (overallPerformanceScore - 0.5) * 2 * 0.05; // ±5% max
  const recentAdjustment = (recentFormScore - 0.5) * 2 * 0.05; // ±5% max

  // Final rating: base (90%) + performance adjustments (10%)
  const threeLayerRating = baseSkillRating + overallAdjustment + recentAdjustment;

  return {
    threeLayerRating,
    baseSkillRating,
    overallPerformanceScore,
    recentFormScore
  };
}

function calculateThreeLayerRating(
  player: TeamAssignment,
  attributeStats: { average: number; standardDeviation: number; min: number; max: number },
  goalDiffStats: { overallMin: number; overallMax: number; recentMin: number; recentMax: number }
): {
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
} {
  // Layer 1: Base Skill Rating (core ability)
  const baseSkillRating = ((player.attack_rating ?? 5) +
                          (player.defense_rating ?? 5) +
                          (player.game_iq_rating ?? 5) +
                          (player.gk_rating ?? 5)) / 4;
  
  // Layer 2: Derived Attributes from Playstyles
  let attributesScore = 0; // Default to 0 (no playstyle ratings)
  if (player.derived_attributes) {
    const attrs = player.derived_attributes;
    // With independent weights: sum attributes (each 0-1) directly
    // Maintain the /6 * 10 scaling to keep scores comparable
    const totalAttributePoints = 
      attrs.pace + 
      attrs.shooting + 
      attrs.passing + 
      attrs.dribbling + 
      attrs.defending + 
      attrs.physical;
    
    // Scale to 0-10 range (max 6 attributes × 1.0 = 6.0, scale to 10)
    attributesScore = (totalAttributePoints / 6) * 10;
  }
  
  // Check if player has enough games for performance metrics
  let overallWinRate, overallGoalDiff, recentWinRate, recentGoalDiff;
  
  if (!player.total_games || player.total_games < MIN_GAMES_FOR_STATS) {
    // New players get neutral performance scores for consistent scaling
    overallWinRate = 0.5; // 50% neutral win rate
    overallGoalDiff = 0;   // Neutral goal differential
    recentWinRate = 0.5;   // 50% neutral win rate
    recentGoalDiff = 0;    // Neutral goal differential
  } else {
    // Experienced players use their actual performance data
    overallWinRate = player.overall_win_rate ?? 0.5;
    overallGoalDiff = player.overall_goal_differential ?? 0;
    recentWinRate = player.win_rate ?? 0.5;
    recentGoalDiff = player.goal_differential ?? 0;
  }
  
  // Layer 2: Overall Performance (career track record)
  // Convert to decimal if it's a percentage (> 1) for experienced players
  if (overallWinRate > 1) {
    overallWinRate = overallWinRate / 100;
  }

  // Normalize goal differential using actual player pool range (percentile-based)
  const gdRange = Math.max(1, goalDiffStats.overallMax - goalDiffStats.overallMin);
  const overallGdNorm = Math.max(0, Math.min(1,
    (overallGoalDiff - goalDiffStats.overallMin) / gdRange
  ));

  // Performance score: center around 0.5 (neutral performance)
  // Win rate and goal diff are already normalized to 0-1, so we combine them
  // then center them for proper adjustment calculation
  const overallPerformanceScore = (overallWinRate + overallGdNorm) / 2;
  
  // Layer 3: Recent Form (last 10 games)
  // Convert to decimal if it's a percentage (> 1) for experienced players
  if (recentWinRate > 1) {
    recentWinRate = recentWinRate / 100;
  }

  // Normalize recent goal differential using actual player pool range
  const recentGdRange = Math.max(1, goalDiffStats.recentMax - goalDiffStats.recentMin);
  const recentGdNorm = Math.max(0, Math.min(1,
    (recentGoalDiff - goalDiffStats.recentMin) / recentGdRange
  ));

  // Recent form score: center around 0.5 (neutral performance)
  const recentFormScore = (recentWinRate + recentGdNorm) / 2;
  
  // Momentum calculation: Compare recent form to overall performance
  const momentum = recentFormScore - overallPerformanceScore;
  let momentumAdjustment = 0;
  let momentumCategory: 'hot' | 'cold' | 'steady' = 'steady';

  // Only apply momentum if both the momentum is significant AND the recent form is genuinely good/bad
  // This prevents penalizing players with strong overall records but slightly lower recent form
  if (Math.abs(momentum) >= MOMENTUM_THRESHOLD_SMALL) {
    if (momentum > 0 && recentWinRate > 0.50) {
      // Hot streak - performing better than usual AND recent form is above average
      momentumCategory = 'hot';
      const scaledMomentum = Math.min(momentum / MOMENTUM_THRESHOLD_LARGE, 1);
      momentumAdjustment = scaledMomentum * MOMENTUM_WEIGHT_HOT;
    } else if (momentum < 0 && recentWinRate < 0.40 && overallWinRate < 0.45) {
      // Cold streak - performing worse than usual AND both recent AND overall form are poor
      // Don't penalize players with strong overall records for recent bad luck
      momentumCategory = 'cold';
      const scaledMomentum = Math.min(Math.abs(momentum) / MOMENTUM_THRESHOLD_LARGE, 1);
      momentumAdjustment = -scaledMomentum * MOMENTUM_WEIGHT_COLD;
    }
  }
  
  // Combined rating with three-layer weighting + momentum
  // The original formula would cap ratings at base skill, which is incorrect
  // We need performance to be able to boost OR reduce ratings
  // Solution: Use performance scores centered around 0.5 (neutral)
  // Score > 0.5 = boost, Score < 0.5 = penalty
  
  // Maximum allowed adjustment to prevent extreme rating changes
  const MAX_RATING_ADJUSTMENT = 0.15; // 15% max change from base rating
  const MAX_ABSOLUTE_ADJUSTMENT = 0.5; // Maximum ±0.5 rating points adjustment
  
  // Center the performance scores around 0 (subtract 0.5 to make neutral = 0)
  let overallAdjustment = (overallPerformanceScore - 0.5) * 2; // Range: -1 to +1
  let recentAdjustment = (recentFormScore - 0.5) * 2; // Range: -1 to +1

  // Apply catastrophic performance penalties for win rates < 30%
  // Only apply if the score isn't already heavily penalized
  if (overallWinRate < 0.3 && overallAdjustment > -0.5) {
    const catastrophicFactor = (0.3 - overallWinRate) * 1.5; // 0-0.45 extra penalty (reduced from 2x)
    overallAdjustment = Math.min(overallAdjustment - catastrophicFactor, overallAdjustment); // Make more negative
  }

  if (recentWinRate < 0.3 && recentAdjustment > -0.5) {
    const recentCatastrophicFactor = (0.3 - recentWinRate) * 1.5;
    recentAdjustment = Math.min(recentAdjustment - recentCatastrophicFactor, recentAdjustment);
  }
  
  // Cap individual performance adjustments to prevent extreme changes
  overallAdjustment = Math.max(-MAX_RATING_ADJUSTMENT / WEIGHT_OVERALL, 
                               Math.min(MAX_RATING_ADJUSTMENT / WEIGHT_OVERALL, overallAdjustment));
  recentAdjustment = Math.max(-MAX_RATING_ADJUSTMENT / WEIGHT_RECENT, 
                              Math.min(MAX_RATING_ADJUSTMENT / WEIGHT_RECENT, recentAdjustment));
  
  // Calculate attributes adjustment using statistical scaling for meaningful impact
  // This creates adjustments typically in the ±0.05 to ±0.3 range instead of ±0.001 to ±0.004
  let attributesAdjustment = 0;
  
  if (attributeStats.standardDeviation > 0) {
    // Standard deviation approach: scale by how many std devs from mean
    const zScore = (attributesScore - attributeStats.average) / attributeStats.standardDeviation;
    // Cap at ±2 standard deviations and scale to create ±0.3 max adjustment
    const cappedZScore = Math.max(-2, Math.min(2, zScore));
    attributesAdjustment = cappedZScore * 0.15; // Range: ±0.3
  } else {
    // Fallback: use range-based scaling if no variation
    const range = Math.max(1.0, attributeStats.max - attributeStats.min);
    attributesAdjustment = (attributesScore - attributeStats.average) / range * 0.3;
  }
  
  // Calculate total adjustment and cap it to prevent excessive changes
  const totalAdjustment = (WEIGHT_ATTRIBUTES * attributesAdjustment) +
                         (WEIGHT_OVERALL * overallAdjustment) + 
                         (WEIGHT_RECENT * recentAdjustment) +
                         (MOMENTUM_WEIGHT * momentumAdjustment);
  
  // Cap the total combined adjustment to ±15% of base rating
  const cappedTotalAdjustment = Math.max(-MAX_RATING_ADJUSTMENT,
                                         Math.min(MAX_RATING_ADJUSTMENT, totalAdjustment));

  // Apply the capped adjustment to base skill
  const percentageAdjusted = baseSkillRating * (1 + cappedTotalAdjustment);

  // Also apply absolute cap to prevent extreme adjustments (±0.5 max)
  const absoluteAdjustment = percentageAdjusted - baseSkillRating;
  const cappedAbsoluteAdjustment = Math.max(-MAX_ABSOLUTE_ADJUSTMENT,
                                            Math.min(MAX_ABSOLUTE_ADJUSTMENT, absoluteAdjustment));
  const finalRating = baseSkillRating + cappedAbsoluteAdjustment;
  
  return {
    threeLayerRating: finalRating,
    baseSkillRating,
    attributesScore,
    attributesAdjustment,
    hasPlaystyleRating: attributesScore > 0,
    overallPerformanceScore,
    recentFormScore,
    momentumScore: momentum,
    momentumCategory,
    momentumAdjustment
  };
}

/**
 * Calculate tier sizes based on total number of players
 */
function calculateTierSizes(totalPlayers: number): number[] {
  if (totalPlayers <= 10) {
    // For small groups, use pairs
    const tiers = Math.floor(totalPlayers / 2);
    const sizes = new Array(tiers).fill(2);
    if (totalPlayers % 2 === 1) {
      sizes[sizes.length - 1] = 3; // Last tier gets the extra player
    }
    return sizes;
  } else if (totalPlayers <= 20) {
    // For medium groups, aim for 3-4 players per tier
    const baseTiers = Math.floor(totalPlayers / 4);
    const remainder = totalPlayers % 4;
    const sizes = new Array(baseTiers).fill(4);
    
    if (remainder > 0) {
      // Distribute remainder
      if (remainder === 1) {
        sizes[sizes.length - 1] = 5; // Add to last tier
      } else if (remainder === 2) {
        sizes.push(2); // New small tier
      } else if (remainder === 3) {
        sizes.push(3); // New tier of 3
      }
    }
    
    // Special case for 18 players: use the specified 4-4-3-4-3 distribution
    if (totalPlayers === 18) {
      return [4, 4, 3, 4, 3];
    }
    
    return sizes;
  } else {
    // For large groups, use 5-6 per tier
    const tiers = Math.ceil(totalPlayers / 5);
    const sizes = new Array(tiers).fill(5);
    const extra = (tiers * 5) - totalPlayers;
    
    // Remove extra slots from the last tiers
    for (let i = 0; i < extra; i++) {
      sizes[sizes.length - 1 - i]--;
    }
    
    return sizes;
  }
}

/**
 * Calculate average attributes for a team
 */
function calculateTeamAttributes(team: PlayerWithRating[]): {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  hasAttributes: boolean;
} {
  // Filter players with attribute data
  const playersWithAttributes = team.filter(p => p.derived_attributes);
  
  if (playersWithAttributes.length === 0) {
    return {
      pace: 0,
      shooting: 0,
      passing: 0,
      dribbling: 0,
      defending: 0,
      physical: 0,
      hasAttributes: false
    };
  }
  
  const total = playersWithAttributes.reduce((acc, player) => {
    const attrs = player.derived_attributes!;
    return {
      pace: acc.pace + attrs.pace,
      shooting: acc.shooting + attrs.shooting,
      passing: acc.passing + attrs.passing,
      dribbling: acc.dribbling + attrs.dribbling,
      defending: acc.defending + attrs.defending,
      physical: acc.physical + attrs.physical
    };
  }, {
    pace: 0,
    shooting: 0,
    passing: 0,
    dribbling: 0,
    defending: 0,
    physical: 0
  });
  
  const count = playersWithAttributes.length;
  return {
    pace: total.pace / count,
    shooting: total.shooting / count,
    passing: total.passing / count,
    dribbling: total.dribbling / count,
    defending: total.defending / count,
    physical: total.physical / count,
    hasAttributes: true
  };
}

/**
 * Calculate attribute balance score between teams
 * Uses weighted average with penalties for extreme differences
 */
function calculateAttributeBalanceScore(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[]): number {
  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  // If neither team has attributes, return 0 (perfect balance)
  if (!blueAttrs.hasAttributes && !orangeAttrs.hasAttributes) {
    return 0;
  }

  // Calculate differences for each attribute (convert from 0-1 to 0-10 scale for consistency)
  const paceDiff = Math.abs(blueAttrs.pace - orangeAttrs.pace) * 10;
  const shootingDiff = Math.abs(blueAttrs.shooting - orangeAttrs.shooting) * 10;
  const passingDiff = Math.abs(blueAttrs.passing - orangeAttrs.passing) * 10;
  const dribblingDiff = Math.abs(blueAttrs.dribbling - orangeAttrs.dribbling) * 10;
  const defendingDiff = Math.abs(blueAttrs.defending - orangeAttrs.defending) * 10;
  const physicalDiff = Math.abs(blueAttrs.physical - orangeAttrs.physical) * 10;

  const diffs = [paceDiff, shootingDiff, passingDiff, dribblingDiff, defendingDiff, physicalDiff];

  // Calculate weighted average with penalty for extreme differences
  const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;

  // Find the maximum difference for penalty calculation
  const maxDiff = Math.max(...diffs);

  // NEW: Complementary strengths balancing for attributes
  // Count how many attributes each team "wins" (is better at)
  const blueWins =
    (blueAttrs.pace > orangeAttrs.pace ? 1 : 0) +
    (blueAttrs.shooting > orangeAttrs.shooting ? 1 : 0) +
    (blueAttrs.passing > orangeAttrs.passing ? 1 : 0) +
    (blueAttrs.dribbling > orangeAttrs.dribbling ? 1 : 0) +
    (blueAttrs.defending > orangeAttrs.defending ? 1 : 0) +
    (blueAttrs.physical > orangeAttrs.physical ? 1 : 0);

  // Dominance factor: 0 = perfectly balanced (3 wins each), 1 = total dominance (6-0 or 0-6)
  const attributeDominance = Math.abs(blueWins - 3.0) / 3.0;

  // Apply penalty multiplier for extreme differences
  // This creates a hybrid approach: mostly average, but penalizes extreme imbalances
  // Progressive penalties catch gaps earlier (e.g., Pace gap of 2.20 triggers 1.25x)
  let penaltyMultiplier = 1.0;
  if (maxDiff > 4.0) {
    penaltyMultiplier = 2.0;  // 100% penalty for catastrophic differences
  } else if (maxDiff > 3.0) {
    penaltyMultiplier = 1.5;  // 50% penalty for very extreme differences
  } else if (maxDiff > 2.0) {
    penaltyMultiplier = 1.25; // 25% penalty for extreme differences (catches Pace 2.20)
  } else if (maxDiff > 1.5) {
    penaltyMultiplier = 1.1;  // 10% penalty for noticeable differences
  } else if (maxDiff > 0.8) {
    penaltyMultiplier = 1.05; // 5% soft penalty for moderate differences (catches Pace 0.98, Defending 1.01)
  }

  // Apply stepped dominance penalty to heavily penalize attribute sweeps
  // 6-0/0-6 sweeps should be severely penalized as they indicate systematic bias
  let dominancePenalty: number;
  if (blueWins === 6 || blueWins === 0) {
    dominancePenalty = 2.5;  // 6-0 sweep: severe penalty
  } else if (blueWins >= 5 || blueWins <= 1) {
    dominancePenalty = 1.8;  // 5-1 split: high penalty
  } else if (blueWins >= 4 || blueWins <= 2) {
    dominancePenalty = 1.3;  // 4-2 split: moderate penalty
  } else {
    dominancePenalty = 1.0;  // 3-3 split: no penalty (ideal balance)
  }

  // Return weighted score that considers both average, extreme values, and dominance
  // This allows some variation while preventing severe imbalances and one-sided teams
  return avgDiff * penaltyMultiplier * dominancePenalty;
}

/**
 * Shooting distribution analysis for ensuring balanced shooting threats
 */
interface ShootingDistribution {
  percentiles: { p25: number; p50: number; p75: number; p90: number };
  nonZeroMean: number;
  nonZeroCount: number;
  totalCount: number;
}

/**
 * Analyze shooting distribution across all players
 */
function analyzeShootingDistribution(players: PlayerWithRating[]): ShootingDistribution {
  const shootingValues = players
    .filter(p => p.derived_attributes?.shooting !== undefined)
    .map(p => p.derived_attributes!.shooting)
    .sort((a, b) => a - b);

  const nonZeroValues = shootingValues.filter(v => v > 0);

  return {
    percentiles: {
      p25: shootingValues[Math.floor(shootingValues.length * 0.25)] || 0,
      p50: shootingValues[Math.floor(shootingValues.length * 0.50)] || 0,
      p75: shootingValues[Math.floor(shootingValues.length * 0.75)] || 0,
      p90: shootingValues[Math.floor(shootingValues.length * 0.90)] || 0
    },
    nonZeroMean: nonZeroValues.length > 0
      ? nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length
      : 0,
    nonZeroCount: nonZeroValues.length,
    totalCount: shootingValues.length
  };
}

/**
 * Categorize a player's shooting threat level based on field distribution
 */
function categorizeShootingThreat(
  player: PlayerWithRating,
  distribution: ShootingDistribution
): 'elite' | 'primary' | 'secondary' | 'none' {
  const shooting = player.derived_attributes?.shooting || 0;

  if (shooting >= distribution.percentiles.p90) return 'elite';
  if (shooting >= distribution.percentiles.p75) return 'primary';
  if (shooting >= distribution.percentiles.p50 && shooting > 0) return 'secondary';
  return 'none';
}

/**
 * Get team shooting profile (count of each threat level)
 */
function getTeamShootingProfile(
  team: PlayerWithRating[],
  distribution: ShootingDistribution
): { elite: number; primary: number; secondary: number; none: number } {
  const profile = { elite: 0, primary: 0, secondary: 0, none: 0 };

  team.forEach(player => {
    const category = categorizeShootingThreat(player, distribution);
    profile[category]++;
  });

  return profile;
}

/**
 * Calculate shooting statistics for the player pool
 */
function calculateShootingStats(players: PlayerWithRating[]): {
  mean: number;
  stdDev: number;
  variance: number;
} {
  const shootingValues = players
    .map(p => p.derived_attributes?.shooting || 0)
    .filter(v => v >= 0);

  if (shootingValues.length === 0) {
    return { mean: 0, stdDev: 0, variance: 0 };
  }

  const mean = shootingValues.reduce((sum, v) => sum + v, 0) / shootingValues.length;
  const variance = shootingValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / shootingValues.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev, variance };
}

/**
 * Calculate shooting imbalance between teams using relative metrics
 */
function calculateShootingImbalance(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  distribution: ShootingDistribution
): number {
  const totalPlayers = blueTeam.length + orangeTeam.length;

  // Calculate team shooting statistics
  const blueShootingValues = blueTeam.map(p => p.derived_attributes?.shooting || 0);
  const orangeShootingValues = orangeTeam.map(p => p.derived_attributes?.shooting || 0);

  const blueMean = blueShootingValues.reduce((sum, v) => sum + v, 0) / blueTeam.length;
  const orangeMean = orangeShootingValues.reduce((sum, v) => sum + v, 0) / orangeTeam.length;

  // Calculate percentile coverage for each team
  const blueAboveP50 = blueTeam.filter(p => (p.derived_attributes?.shooting || 0) > distribution.percentiles.p50).length;
  const orangeAboveP50 = orangeTeam.filter(p => (p.derived_attributes?.shooting || 0) > distribution.percentiles.p50).length;

  const blueAboveP75 = blueTeam.filter(p => (p.derived_attributes?.shooting || 0) >= distribution.percentiles.p75).length;
  const orangeAboveP75 = orangeTeam.filter(p => (p.derived_attributes?.shooting || 0) >= distribution.percentiles.p75).length;

  const blueAboveP25 = blueTeam.filter(p => (p.derived_attributes?.shooting || 0) > distribution.percentiles.p25).length;
  const orangeAboveP25 = orangeTeam.filter(p => (p.derived_attributes?.shooting || 0) > distribution.percentiles.p25).length;

  // Calculate relative imbalance scores (normalized by team size)
  const p50Imbalance = Math.abs(blueAboveP50 / blueTeam.length - orangeAboveP50 / orangeTeam.length);
  const p75Imbalance = Math.abs(blueAboveP75 / blueTeam.length - orangeAboveP75 / orangeTeam.length);
  const p25Imbalance = Math.abs(blueAboveP25 / blueTeam.length - orangeAboveP25 / orangeTeam.length);

  // Weight different percentiles by importance
  const percentileImbalance = (p75Imbalance * 3.0) + (p50Imbalance * 2.0) + (p25Imbalance * 1.0);

  // Calculate mean difference relative to overall distribution
  const meanDifference = Math.abs(blueMean - orangeMean);

  // Calculate shooting diversity for each team (entropy-based)
  const calculateDiversity = (team: PlayerWithRating[]) => {
    const counts = {
      high: team.filter(p => (p.derived_attributes?.shooting || 0) >= distribution.percentiles.p75).length,
      mid: team.filter(p => {
        const s = p.derived_attributes?.shooting || 0;
        return s >= distribution.percentiles.p25 && s < distribution.percentiles.p75;
      }).length,
      low: team.filter(p => (p.derived_attributes?.shooting || 0) < distribution.percentiles.p25).length
    };

    const total = team.length;
    const proportions = [counts.high / total, counts.mid / total, counts.low / total];

    // Calculate entropy (higher = more diverse = better)
    const entropy = -proportions
      .filter(p => p > 0)
      .reduce((sum, p) => sum + p * Math.log(p), 0);

    return entropy;
  };

  const blueDiversity = calculateDiversity(blueTeam);
  const orangeDiversity = calculateDiversity(orangeTeam);
  const diversityGap = Math.abs(blueDiversity - orangeDiversity);

  // Get elite shooter counts for clustering penalty
  const blueElite = blueTeam.filter(p => (p.derived_attributes?.shooting || 0) >= distribution.percentiles.p90).length;
  const orangeElite = orangeTeam.filter(p => (p.derived_attributes?.shooting || 0) >= distribution.percentiles.p90).length;

  // Significant penalty for elite shooter clustering
  const eliteGap = Math.abs(blueElite - orangeElite);
  const eliteClusteringPenalty = eliteGap > 1 ? eliteGap * 8.0 : eliteGap * 2.0; // Heavy penalty, especially for gap > 1

  // Combine metrics with weights (including elite clustering)
  const totalImbalance = (percentileImbalance * 4.0) +  // Most important
                         (meanDifference * 2.0) +         // Important
                         (diversityGap * 1.0) +           // Less important
                         eliteClusteringPenalty;          // Critical for balance

  return totalImbalance;
}

/**
 * Calculate priority score for a potential swap
 * Higher scores indicate better swaps to attempt first
 */
function calculateSwapPriority(
  beforeDetails: BalanceScoreDetails,
  afterDetails: BalanceScoreDetails,
  attributeBalance: number
): number {
  // Calculate improvements for each metric
  const skillImprovement = (beforeDetails.skillBalance ?? 0) - (afterDetails.skillBalance ?? 0);
  const attackImprove = beforeDetails.attackDiff - afterDetails.attackDiff;
  const defenseImprove = beforeDetails.defenseDiff - afterDetails.defenseDiff;
  const gameIqImprove = beforeDetails.gameIqDiff - afterDetails.gameIqDiff;

  // Win rate gap improvement (positive is good)
  const winRateGapBefore = Math.abs((beforeDetails.blueWinRate ?? 50) - (beforeDetails.orangeWinRate ?? 50));
  const winRateGapAfter = Math.abs((afterDetails.blueWinRate ?? 50) - (afterDetails.orangeWinRate ?? 50));
  const winRateImprove = winRateGapBefore - winRateGapAfter;

  // Calculate priority score with weights
  let priority = 0;

  // Primary factor: Overall skill improvement (40% weight)
  priority += skillImprovement * 4.0;

  // Secondary factors: Individual skill improvements (30% total)
  priority += Math.max(attackImprove, defenseImprove, gameIqImprove) * 3.0;

  // Tertiary factor: Win rate gap reduction (20% weight)
  priority += (winRateImprove / 10) * 2.0; // Normalize to 0-2 range

  // Penalty for attribute imbalance (25% weight, negative) - increased from 10%
  // Lower attribute imbalance = higher priority
  priority -= (attributeBalance / 5) * 2.5;

  // Bonus for fixing severe imbalances
  if (skillImprovement > 0.5) {
    priority += 2.0; // Significant bonus for major improvements
  }

  return priority;
}

/**
 * Apply snake draft with a specific starting team
 */
function applySnakeDraftWithStart(
  tiers: TierInfo[],
  startWithBlue: boolean,
  debugLog?: { value: string }
): { blueTeam: PlayerWithRating[]; orangeTeam: PlayerWithRating[] } {
  const blueTeam: PlayerWithRating[] = [];
  const orangeTeam: PlayerWithRating[] = [];

  // Calculate total players to determine target team sizes
  const totalPlayers = tiers.reduce((sum, tier) => sum + tier.players.length, 0);
  const targetTeamSize = Math.floor(totalPlayers / 2);

  // Use specified starting team
  let bluePicksFirst = startWithBlue;
  const initialFirstPicker = bluePicksFirst ? 'Blue' : 'Orange';

  // PHASE 3: Shooting-Aware Draft - Track elite shooter distribution
  const allPlayers = tiers.flatMap(t => t.players);
  const shootingDistribution = analyzeShootingDistribution(allPlayers);
  const eliteShooterThreshold = shootingDistribution.percentiles.p90;

  let blueEliteShooters = 0;
  let orangeEliteShooters = 0;
  let shootingAdjustments = 0;

  if (debugLog && !debugLog.value.includes("Testing")) {
    debugLog.value += `\n🎯 SHOOTING-AWARE DRAFT ENABLED\n`;
    debugLog.value += `Elite shooter threshold (P90): ${eliteShooterThreshold.toFixed(3)}\n`;
    debugLog.value += `Will adjust picks if elite shooter gap reaches 2\n\n`;
  }

  // Suppress detailed logging during testing phase

  // Pre-calculate how the standard snake draft would distribute players
  let simulatedBlueCount = 0;
  let simulatedOrangeCount = 0;
  let simulatedBlueFirst = bluePicksFirst;
  
  tiers.forEach((tier) => {
    const tierSize = tier.players.length;
    if (simulatedBlueFirst) {
      simulatedBlueCount += Math.ceil(tierSize / 2);
      simulatedOrangeCount += Math.floor(tierSize / 2);
    } else {
      simulatedOrangeCount += Math.ceil(tierSize / 2);
      simulatedBlueCount += Math.floor(tierSize / 2);
    }
    simulatedBlueFirst = !simulatedBlueFirst;
  });
  
  // Check if standard snake draft would create imbalance
  const wouldBeImbalanced = Math.abs(simulatedBlueCount - simulatedOrangeCount) > 1;
  
  if (wouldBeImbalanced && debugLog) {
    debugLog.value += `Warning: Standard snake draft would create imbalance (Blue: ${simulatedBlueCount}, Orange: ${simulatedOrangeCount})\n`;
    debugLog.value += `Adjusting draft pattern to ensure balanced teams...\n\n`;
  }
  
  // Track actual picks for balance
  let currentTierIndex = 0;
  
  tiers.forEach((tier, tierIndex) => {
    const tierPlayers = [...tier.players]; // Copy to avoid mutation
    currentTierIndex = tierIndex;
    
    // Only log during actual draft, not during testing
    if (debugLog && !debugLog.value.includes("Testing")) {
      debugLog.value += `Tier ${tier.tierNumber} Draft:\n`;
      debugLog.value += `  ${bluePicksFirst ? 'Blue' : 'Orange'} picks first\n`;
    }
    
    // Check if we need to adjust the pattern to maintain balance
    let adjustedPattern = false;
    const remainingTiers = tiers.length - tierIndex - 1;
    const currentBlueTotal = blueTeam.length;
    const currentOrangeTotal = orangeTeam.length;
    
    // If we're in the last few tiers and teams are getting imbalanced, adjust
    if (remainingTiers <= 2 && Math.abs(currentBlueTotal - currentOrangeTotal) >= 2) {
      // Give more picks to the team that's behind
      if (currentBlueTotal > currentOrangeTotal && bluePicksFirst) {
        bluePicksFirst = false;
        adjustedPattern = true;
        if (debugLog) debugLog.value += `  [Adjusted to Orange first to balance teams]\n`;
      } else if (currentOrangeTotal > currentBlueTotal && !bluePicksFirst) {
        bluePicksFirst = true;
        adjustedPattern = true;
        if (debugLog) debugLog.value += `  [Adjusted to Blue first to balance teams]\n`;
      }
    }
    
    // Distribute players in this tier
    tierPlayers.forEach((player, index) => {
      const playerShooting = player.derived_attributes?.shooting || 0;
      const isEliteShooter = playerShooting >= eliteShooterThreshold;

      // PHASE 3: Check for shooting imbalance BEFORE this pick
      // If elite shooter gap is ≥2, give next pick to team with fewer elite shooters
      const eliteShooterGap = Math.abs(blueEliteShooters - orangeEliteShooters);
      let shootingAdjusted = false;

      if (isEliteShooter && eliteShooterGap >= 2 && index < tierPlayers.length - 1) {
        // Adjust pick order to favor team with fewer elite shooters
        const blueNeedsPriority = blueEliteShooters < orangeEliteShooters;
        const orangeNeedsPriority = orangeEliteShooters < blueEliteShooters;

        // Check if we need to override the current pick order
        if (blueNeedsPriority && !bluePicksFirst && index % 2 === 0) {
          // Blue needs priority but Orange would pick - swap for this pick only
          bluePicksFirst = !bluePicksFirst;
          shootingAdjusted = true;
          shootingAdjustments++;
          if (debugLog && !debugLog.value.includes("Testing")) {
            debugLog.value += `  [🎯 Shooting adjustment: Blue gets priority (elite gap: ${orangeEliteShooters} vs ${blueEliteShooters})]\n`;
          }
        } else if (orangeNeedsPriority && bluePicksFirst && index % 2 === 0) {
          // Orange needs priority but Blue would pick - swap for this pick only
          bluePicksFirst = !bluePicksFirst;
          shootingAdjusted = true;
          shootingAdjustments++;
          if (debugLog && !debugLog.value.includes("Testing")) {
            debugLog.value += `  [🎯 Shooting adjustment: Orange gets priority (elite gap: ${blueEliteShooters} vs ${orangeEliteShooters})]\n`;
          }
        }
      }

      // Track which team will get this player
      let assignedToBlue = false;

      // SYSTEMATIC BIAS CHECK: Evaluate which assignment creates better metric balance
      const biasEval = evaluateDraftAssignment(player, blueTeam, orangeTeam);
      let biasAdjusted = false;

      // Check if either team has reached the target size
      if (blueTeam.length >= targetTeamSize && orangeTeam.length < targetTeamSize) {
        orangeTeam.push(player);
        if (isEliteShooter) orangeEliteShooters++;
        if (debugLog && !debugLog.value.includes("Testing")) {
          const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
          debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Orange (Blue team full)\n`;
        }
      } else if (orangeTeam.length >= targetTeamSize && blueTeam.length < targetTeamSize) {
        blueTeam.push(player);
        assignedToBlue = true;
        if (isEliteShooter) blueEliteShooters++;
        if (debugLog && !debugLog.value.includes("Testing")) {
          const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
          debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Blue (Orange team full)\n`;
        }
      } else {
        // Normal snake draft distribution WITH systematic bias awareness
        const defaultToBlue = bluePicksFirst ? (index % 2 === 0) : (index % 2 !== 0);

        // Check if bias adjustment would help (only when bias difference is significant)
        const biasDiff = Math.abs(biasEval.blueScore - biasEval.orangeScore);
        const shouldOverrideForBias = biasDiff > 0.2 && biasEval.preferBlue !== defaultToBlue;

        // Override assignment if it significantly improves metric balance
        // BUT respect team size constraints - don't let teams get too uneven
        const teamSizeDiff = Math.abs(blueTeam.length - orangeTeam.length);
        const canOverride = teamSizeDiff < 2; // Only override if teams are relatively even

        if (shouldOverrideForBias && canOverride) {
          biasAdjusted = true;
          if (biasEval.preferBlue) {
            blueTeam.push(player);
            assignedToBlue = true;
            if (isEliteShooter) blueEliteShooters++;
            if (debugLog && !debugLog.value.includes("Testing")) {
              const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
              debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Blue [⚖️ BIAS ADJ: ${biasEval.reason}]\n`;
            }
          } else {
            orangeTeam.push(player);
            if (isEliteShooter) orangeEliteShooters++;
            if (debugLog && !debugLog.value.includes("Testing")) {
              const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
              debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Orange [⚖️ BIAS ADJ: ${biasEval.reason}]\n`;
            }
          }
        } else if (bluePicksFirst) {
          // Blue picks on even indices (0, 2, 4...)
          if (index % 2 === 0) {
            blueTeam.push(player);
            assignedToBlue = true;
            if (isEliteShooter) blueEliteShooters++;
            if (debugLog && !debugLog.value.includes("Testing")) {
              const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
              debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Blue\n`;
            }
          } else {
            orangeTeam.push(player);
            if (isEliteShooter) orangeEliteShooters++;
            if (debugLog && !debugLog.value.includes("Testing")) {
              const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
              debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Orange\n`;
            }
          }
        } else {
          // Orange picks on even indices (0, 2, 4...)
          if (index % 2 === 0) {
            orangeTeam.push(player);
            if (isEliteShooter) orangeEliteShooters++;
            if (debugLog && !debugLog.value.includes("Testing")) {
              const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
              debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Orange\n`;
            }
          } else {
            blueTeam.push(player);
            assignedToBlue = true;
            if (isEliteShooter) blueEliteShooters++;
            if (debugLog && !debugLog.value.includes("Testing")) {
              const shooterLabel = isEliteShooter ? ` 🎯(${playerShooting.toFixed(2)})` : '';
              debugLog.value += `  Pick ${index + 1}: ${player.friendly_name}${shooterLabel} → Blue\n`;
            }
          }
        }
      }

      // PHASE 3: Revert shooting adjustment after the pick
      if (shootingAdjusted) {
        bluePicksFirst = !bluePicksFirst;
      }
    });
    
    // Always alternate which team picks first in the next tier (unless we adjusted)
    if (!adjustedPattern) {
      bluePicksFirst = !bluePicksFirst;
    }
    
    if (debugLog && tier !== tiers[tiers.length - 1]) {
      debugLog.value += `  → Next tier: ${bluePicksFirst ? 'Blue' : 'Orange'} will pick first\n`;
    }
    
    if (debugLog) {
      debugLog.value += `  Current totals: Blue ${blueTeam.length}, Orange ${orangeTeam.length}\n\n`;
    }
  });
  
  // Final balance check - if teams are uneven, move last picked player
  if (Math.abs(blueTeam.length - orangeTeam.length) > 1) {
    if (debugLog) {
      debugLog.value += 'TEAM BALANCE ADJUSTMENT:\n';
      debugLog.value += `Teams are unbalanced (Blue: ${blueTeam.length}, Orange: ${orangeTeam.length})\n`;
    }
    
    if (blueTeam.length > orangeTeam.length) {
      // Move last blue player to orange
      const playerToMove = blueTeam.pop();
      if (playerToMove) {
        orangeTeam.push(playerToMove);
        if (debugLog) debugLog.value += `Moving ${playerToMove.friendly_name} from Blue to Orange\n`;
      }
    } else {
      // Move last orange player to blue
      const playerToMove = orangeTeam.pop();
      if (playerToMove) {
        blueTeam.push(playerToMove);
        if (debugLog) debugLog.value += `Moving ${playerToMove.friendly_name} from Orange to Blue\n`;
      }
    }
    
    if (debugLog) {
      debugLog.value += `Final totals: Blue ${blueTeam.length}, Orange ${orangeTeam.length}\n\n`;
    }
  }

  // PHASE 3: Report shooting distribution results
  if (debugLog && !debugLog.value.includes("Testing")) {
    const finalEliteGap = Math.abs(blueEliteShooters - orangeEliteShooters);
    const allPlayers = [...blueTeam, ...orangeTeam];
    const finalShootingDist = analyzeShootingDistribution(allPlayers);
    const finalShootingImbalance = calculateShootingImbalance(blueTeam, orangeTeam, finalShootingDist);

    debugLog.value += `\n🎯 SHOOTING-AWARE DRAFT RESULTS\n`;
    debugLog.value += `================================\n`;
    debugLog.value += `Elite shooter distribution: Blue ${blueEliteShooters}, Orange ${orangeEliteShooters} (gap: ${finalEliteGap})\n`;
    debugLog.value += `Shooting adjustments made: ${shootingAdjustments}\n`;
    debugLog.value += `Final shooting imbalance score: ${finalShootingImbalance.toFixed(2)}\n`;

    if (finalEliteGap <= 1) {
      debugLog.value += `✅ Elite shooter distribution: EXCELLENT (gap ≤ 1)\n`;
    } else if (finalEliteGap === 2) {
      debugLog.value += `⚠️ Elite shooter distribution: ACCEPTABLE (gap = 2)\n`;
    } else {
      debugLog.value += `❌ Elite shooter distribution: POOR (gap > 2)\n`;
    }

    // List elite shooters on each team
    const blueElite = blueTeam.filter(p => (p.derived_attributes?.shooting || 0) >= eliteShooterThreshold);
    const orangeElite = orangeTeam.filter(p => (p.derived_attributes?.shooting || 0) >= eliteShooterThreshold);

    if (blueElite.length > 0) {
      debugLog.value += `\nBlue Elite Shooters:\n`;
      blueElite.forEach(p => {
        debugLog.value += `  - ${p.friendly_name} (${p.derived_attributes?.shooting.toFixed(2)})\n`;
      });
    }

    if (orangeElite.length > 0) {
      debugLog.value += `\nOrange Elite Shooters:\n`;
      orangeElite.forEach(p => {
        debugLog.value += `  - ${p.friendly_name} (${p.derived_attributes?.shooting.toFixed(2)})\n`;
      });
    }

    debugLog.value += '\n';
  }

  return { blueTeam, orangeTeam };
}

/**
 * Apply snake draft deterministically by trying both starting options
 * Returns the configuration with better initial balance
 */
function applySnakeDraft(tiers: TierInfo[], permanentGKIds: string[] = [], debugLog?: { value: string }): { blueTeam: PlayerWithRating[]; orangeTeam: PlayerWithRating[] } {
  if (debugLog) {
    debugLog.value += '\nSTEP 4: SNAKE DRAFT PROCESS\n';
    debugLog.value += '============================\n';
    debugLog.value += 'Testing both starting options to find optimal configuration...\n\n';
  }

  // Try both starting options
  const tempLog = { value: 'Testing configurations...\n' };
  const blueFirstResult = applySnakeDraftWithStart(tiers, true, tempLog);
  const blueFirstBalance = calculateTierBalanceScore(blueFirstResult.blueTeam, blueFirstResult.orangeTeam, permanentGKIds);

  const orangeFirstResult = applySnakeDraftWithStart(tiers, false, tempLog);
  const orangeFirstBalance = calculateTierBalanceScore(orangeFirstResult.blueTeam, orangeFirstResult.orangeTeam, permanentGKIds);

  // Also consider shooting distribution when selecting configuration
  const allPlayers = [...blueFirstResult.blueTeam, ...blueFirstResult.orangeTeam];
  const shootingDist = analyzeShootingDistribution(allPlayers);

  const blueFirstShooting = calculateShootingImbalance(
    blueFirstResult.blueTeam,
    blueFirstResult.orangeTeam,
    shootingDist
  );

  const orangeFirstShooting = calculateShootingImbalance(
    orangeFirstResult.blueTeam,
    orangeFirstResult.orangeTeam,
    shootingDist
  );

  // Combine balance and shooting scores (shooting weighted at 20% of decision)
  const blueFirstCombined = blueFirstBalance + (blueFirstShooting * 0.2);
  const orangeFirstCombined = orangeFirstBalance + (orangeFirstShooting * 0.2);

  // Choose the better configuration based on combined score
  const betterConfiguration = blueFirstCombined <= orangeFirstCombined ? 'Blue' : 'Orange';
  const betterResult = blueFirstCombined <= orangeFirstCombined ? blueFirstResult : orangeFirstResult;
  const betterBalance = Math.min(blueFirstBalance, orangeFirstBalance);
  const betterShooting = betterConfiguration === 'Blue' ? blueFirstShooting : orangeFirstShooting;

  if (debugLog) {
    debugLog.value += `Blue first: balance=${blueFirstBalance.toFixed(3)}, shooting=${blueFirstShooting.toFixed(2)}, combined=${blueFirstCombined.toFixed(3)}\n`;
    debugLog.value += `Orange first: balance=${orangeFirstBalance.toFixed(3)}, shooting=${orangeFirstShooting.toFixed(2)}, combined=${orangeFirstCombined.toFixed(3)}\n`;
    debugLog.value += `Selected: ${betterConfiguration} team picking first (better combined score)\n\n`;

    // Now do the actual draft with logging
    debugLog.value += 'EXECUTING SELECTED CONFIGURATION\n';
    debugLog.value += '================================\n';

    const totalPlayers = tiers.reduce((sum, tier) => sum + tier.players.length, 0);
    const targetTeamSize = Math.floor(totalPlayers / 2);
    debugLog.value += `${betterConfiguration} team picks first\n`;
    debugLog.value += `Target team size: ${targetTeamSize} players each (${totalPlayers} total)\n\n`;

    // Re-run with logging for the selected configuration
    const finalResult = applySnakeDraftWithStart(tiers, betterConfiguration === 'Blue', debugLog);
    return finalResult;
  }

  return betterResult;
}

/**
 * Calculate balance score for tier-based teams
 * Uses Attack, Defense, Game IQ, GK, and Derived Attributes for balance calculation
 */
function calculateTierBalanceScore(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[], permanentGKIds?: string[]): number {
  if (blueTeam.length === 0 || orangeTeam.length === 0) {
    return 1000; // Very high score for empty teams
  }

  // Identify permanent goalkeepers in each team
  const bluePermanentGKs = blueTeam.filter(p => permanentGKIds?.includes(p.player_id));
  const orangePermanentGKs = orangeTeam.filter(p => permanentGKIds?.includes(p.player_id));

  // Calculate outfield players (excluding permanent GKs)
  const blueOutfield = blueTeam.filter(p => !permanentGKIds?.includes(p.player_id));
  const orangeOutfield = orangeTeam.filter(p => !permanentGKIds?.includes(p.player_id));

  // For attack and defense: use outfield players only (or full team if no outfield players)
  const bluePlayersForOutfield = blueOutfield.length > 0 ? blueOutfield : blueTeam;
  const orangePlayersForOutfield = orangeOutfield.length > 0 ? orangeOutfield : orangeTeam;

  // Calculate average ratings
  // Attack and Defense: EXCLUDE permanent GKs (they're in goal)
  const blueAttack = bluePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeAttack = orangePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangePlayersForOutfield.length;

  const blueDefense = bluePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeDefense = orangePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangePlayersForOutfield.length;

  // Game IQ: INCLUDE all players (positioning/awareness matters for everyone including GK)
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  // Calculate GK ratings
  // If team has permanent GK(s), use the highest rated permanent GK's rating
  // Otherwise, use team average

  const blueGk = bluePermanentGKs.length > 0
    ? Math.max(...bluePermanentGKs.map(p => p.gk_rating ?? 5))
    : blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;

  const orangeGk = orangePermanentGKs.length > 0
    ? Math.max(...orangePermanentGKs.map(p => p.gk_rating ?? 5))
    : orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  // Calculate skill differences
  const attackDiff = Math.abs(blueAttack - orangeAttack);
  const defenseDiff = Math.abs(blueDefense - orangeDefense);
  const gameIqDiff = Math.abs(blueGameIq - orangeGameIq);
  const gkDiff = Math.abs(blueGk - orangeGk);

  // GK weighting depends on whether permanent GKs exist:
  // - With permanent GK: GK rating matters more (they're the dedicated keeper)
  // - Rotating keeper: GK rating matters less (~7 min each per 60 min match)
  const hasPermanentGKs = bluePermanentGKs.length > 0 || orangePermanentGKs.length > 0;
  const gkWeight = hasPermanentGKs ? 0.25 : 0.10; // Full weight vs reduced weight
  const coreWeight = hasPermanentGKs ? 0.25 : 0.30; // Remaining split among 3 core skills

  // Calculate weighted skill balance
  const weightedSkillBalance =
    (attackDiff * coreWeight) +
    (defenseDiff * coreWeight) +
    (gameIqDiff * coreWeight) +
    (gkDiff * gkWeight);

  // NEW: Complementary strengths balancing (for core skills only)
  // Count how many CORE skills each team "wins" (Attack, Defense, Game IQ)
  const blueCoreWins =
    (blueAttack > orangeAttack ? 1 : 0) +
    (blueDefense > orangeDefense ? 1 : 0) +
    (blueGameIq > orangeGameIq ? 1 : 0);

  // Dominance factor: 0 = perfectly balanced (1.5 wins each), 1 = total dominance (3-0 or 0-3)
  // Ideal: each team wins ~1.5 core skills (one clear winner, one closer)
  const dominanceFactor = Math.abs(blueCoreWins - 1.5) / 1.5;

  // Apply dominance penalty to skill balance
  // If dominance = 0 (balanced): use 70% of weighted diff
  // If dominance = 1 (3-0 split): use 100% of weighted diff
  const skillBalance = weightedSkillBalance * (0.7 + dominanceFactor * 0.3);

  // Calculate attribute balance score
  const attributeBalance = calculateAttributeBalanceScore(blueTeam, orangeTeam);

  // Weight skills at 60% and attributes at 40% to properly balance gameplay impact
  // Attributes (shooting, defending, pace) represent real in-game capabilities
  const combinedBalance = (skillBalance * 0.60) + (attributeBalance * 0.40);

  return combinedBalance;
}

/**
 * Balance score details interface
 */
interface BalanceScoreDetails {
  totalScore: number;
  skillBalance: number;
  attributeBalance: number;
  attackDiff: number;
  defenseDiff: number;
  gameIqDiff: number;
  gkDiff: number;
  paceDiff?: number;
  shootingDiff?: number;
  passingDiff?: number;
  dribblingDiff?: number;
  defendingDiff?: number;
  physicalDiff?: number;
  shootingImbalance?: number; // Weighted shooting threat distribution score
  hasAttributes: boolean;
  primaryFactor: 'skills' | 'attributes' | 'both';
  blueWinRate?: number;
  orangeWinRate?: number;
  blueGoalDiff?: number;
  orangeGoalDiff?: number;
}

/**
 * Calculate detailed balance score with breakdown
 */
function calculateDetailedBalanceScore(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[], permanentGKIds: string[] = []): BalanceScoreDetails {
  if (blueTeam.length === 0 || orangeTeam.length === 0) {
    return {
      totalScore: 1000,
      skillBalance: 1000,
      attributeBalance: 0,
      attackDiff: 0,
      defenseDiff: 0,
      gameIqDiff: 0,
      gkDiff: 0,
      hasAttributes: false,
      primaryFactor: 'skills'
    };
  }

  // Identify permanent goalkeepers in each team
  const bluePermanentGKs = blueTeam.filter(p => permanentGKIds.includes(p.player_id));
  const orangePermanentGKs = orangeTeam.filter(p => permanentGKIds.includes(p.player_id));

  // Calculate outfield players (excluding permanent GKs)
  const blueOutfield = blueTeam.filter(p => !permanentGKIds.includes(p.player_id));
  const orangeOutfield = orangeTeam.filter(p => !permanentGKIds.includes(p.player_id));

  // For attack and defense: use outfield players only (or full team if no outfield players)
  const bluePlayersForOutfield = blueOutfield.length > 0 ? blueOutfield : blueTeam;
  const orangePlayersForOutfield = orangeOutfield.length > 0 ? orangeOutfield : orangeTeam;

  // Calculate average ratings
  // Attack and Defense: EXCLUDE permanent GKs (they're in goal)
  const blueAttack = bluePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeAttack = orangePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangePlayersForOutfield.length;

  const blueDefense = bluePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeDefense = orangePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangePlayersForOutfield.length;

  // Game IQ: INCLUDE all players (positioning/awareness matters for everyone including GK)
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  // Calculate GK ratings (use permanent GK rating if applicable, otherwise team average)

  const blueGk = bluePermanentGKs.length > 0
    ? Math.max(...bluePermanentGKs.map(p => p.gk_rating ?? 5))
    : blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;

  const orangeGk = orangePermanentGKs.length > 0
    ? Math.max(...orangePermanentGKs.map(p => p.gk_rating ?? 5))
    : orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  // Calculate skill differences
  const attackDiff = Math.abs(blueAttack - orangeAttack);
  const defenseDiff = Math.abs(blueDefense - orangeDefense);
  const gameIqDiff = Math.abs(blueGameIq - orangeGameIq);
  const gkDiff = Math.abs(blueGk - orangeGk);
  
  // Calculate attribute balance score and individual diffs
  const attributeBalance = calculateAttributeBalanceScore(blueTeam, orangeTeam);
  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);
  
  const hasAttributes = blueAttrs.hasAttributes && orangeAttrs.hasAttributes;
  let paceDiff = 0, shootingDiff = 0, passingDiff = 0, dribblingDiff = 0, defendingDiff = 0, physicalDiff = 0;
  
  if (hasAttributes) {
    paceDiff = Math.abs(blueAttrs.pace - orangeAttrs.pace);
    shootingDiff = Math.abs(blueAttrs.shooting - orangeAttrs.shooting);
    passingDiff = Math.abs(blueAttrs.passing - orangeAttrs.passing);
    dribblingDiff = Math.abs(blueAttrs.dribbling - orangeAttrs.dribbling);
    defendingDiff = Math.abs(blueAttrs.defending - orangeAttrs.defending);
    physicalDiff = Math.abs(blueAttrs.physical - orangeAttrs.physical);
  }
  
  // Calculate win rate and goal diff for teams
  const blueWinRate = blueTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / blueTeam.length;
  const orangeWinRate = orangeTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / orangeTeam.length;
  const blueGoalDiff = blueTeam.reduce((sum, p) => sum + (p.goal_differential ?? 0), 0);
  const orangeGoalDiff = orangeTeam.reduce((sum, p) => sum + (p.goal_differential ?? 0), 0);

  // Calculate shooting imbalance (threat distribution)
  const allPlayers = [...blueTeam, ...orangeTeam];
  const shootingDistribution = analyzeShootingDistribution(allPlayers);
  const shootingImbalance = calculateShootingImbalance(blueTeam, orangeTeam, shootingDistribution);

  // Weight skills at 85% and attributes at 15% to match updated rating calculation
  // Use cumulative+max hybrid: 60% worst imbalance + 40% average across all skills
  // This captures both the worst individual imbalance AND cumulative drift
  const maxSkillDiff = Math.max(attackDiff, defenseDiff, gameIqDiff, gkDiff);
  const avgSkillDiff = (attackDiff + defenseDiff + gameIqDiff + gkDiff) / 4;
  const skillBalance = (maxSkillDiff * 0.6) + (avgSkillDiff * 0.4);

  // Include shooting imbalance as a factor (normalized to same scale as skills)
  // Normalize shooting imbalance to 0-10 scale (typical range is 0-10)
  const normalizedShootingImbalance = Math.min(shootingImbalance, 10);

  // Dynamic shooting weight based on imbalance level
  // Base weight is 10%, scales up to 25% when shooting imbalance is severe
  const shootingStats = calculateShootingStats(allPlayers);
  const relativeShootingImbalance = shootingStats.stdDev > 0
    ? normalizedShootingImbalance / (shootingStats.stdDev * 2)
    : normalizedShootingImbalance / 5;

  // Weight increases from 10% to 25% based on severity
  const dynamicShootingWeight = Math.min(0.25, 0.10 + (relativeShootingImbalance * 0.15));

  // Adjust weights to maintain total of 100%
  const remainingWeight = 1.0 - dynamicShootingWeight;
  const skillWeight = remainingWeight * 0.833; // ~75% of remaining
  const attributeWeight = remainingWeight * 0.167; // ~15% of remaining

  // Combine with dynamic weights
  const combinedBalance = (skillBalance * skillWeight) +
                         (attributeBalance * attributeWeight) +
                         (normalizedShootingImbalance * dynamicShootingWeight);

  // Determine primary factor
  let primaryFactor: 'skills' | 'attributes' | 'both' = 'skills';
  if (hasAttributes && attributeBalance > 0) {
    const skillContribution = skillBalance * 0.8;
    const attributeContribution = attributeBalance * 0.2;
    if (attributeContribution > skillContribution * 0.5) {
      primaryFactor = attributeContribution > skillContribution ? 'attributes' : 'both';
    }
  }

  return {
    totalScore: combinedBalance,
    skillBalance,
    attributeBalance,
    attackDiff,
    defenseDiff,
    gameIqDiff,
    gkDiff,
    paceDiff,
    shootingDiff,
    passingDiff,
    dribblingDiff,
    defendingDiff,
    physicalDiff,
    shootingImbalance,
    hasAttributes,
    primaryFactor,
    blueWinRate,
    orangeWinRate,
    blueGoalDiff,
    orangeGoalDiff
  };
}

/**
 * Calculate tier fairness score based on distribution variance and quality concentration
 * Lower scores are better (0 = perfectly fair)
 */
function calculateTierFairness(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[]): number {
  // Count players by tier for each team
  const blueTierCounts = new Map<number, number>();
  const orangeTierCounts = new Map<number, number>();
  const tierPlayers = new Map<number, PlayerWithRating[]>();

  // Collect all players by tier
  const allPlayers = [...blueTeam, ...orangeTeam];
  allPlayers.forEach(player => {
    const tier = player.tier ?? 1;
    if (!tierPlayers.has(tier)) {
      tierPlayers.set(tier, []);
    }
    tierPlayers.get(tier)!.push(player);

    // Count for each team
    if (blueTeam.includes(player)) {
      blueTierCounts.set(tier, (blueTierCounts.get(tier) || 0) + 1);
    } else {
      orangeTierCounts.set(tier, (orangeTierCounts.get(tier) || 0) + 1);
    }
  });

  let totalImbalance = 0;
  let tierCount = 0;
  const maxTier = Math.max(...Array.from(tierPlayers.keys()));

  // Calculate imbalance for each tier
  tierPlayers.forEach((players, tier) => {
    const blueCount = blueTierCounts.get(tier) || 0;
    const orangeCount = orangeTierCounts.get(tier) || 0;
    const tierSize = players.length;

    // Variance from ideal split (tier size / 2)
    const idealSplit = tierSize / 2;
    const variance = Math.abs(blueCount - idealSplit) + Math.abs(orangeCount - idealSplit);

    // Calculate tier weighting based on tier position
    // Top tier (Tier 1): weight 1.2 to prevent star stacking
    // Bottom tier: normal weight 1.0
    // Near top/bottom tiers (Tier 2 and Tier 4): weight 1.2
    // Mid-tiers (Tier 3): highest weight 1.5 (where depth advantage matters most)
    let tierWeight = 1.0;
    if (tier === 1) {
      tierWeight = 1.2;  // Top tier - increased to prevent star stacking
    } else if (tier === maxTier) {
      tierWeight = 1.0;  // Bottom tier: normal weight
    } else if (tier === 2 || tier === maxTier - 1) {
      tierWeight = 1.2;  // Near top/bottom: slightly higher
    } else {
      tierWeight = 1.5;  // Mid-tiers: highest weight (3-4 for 5-tier system)
    }

    // Normalize by tier size and apply tier weighting
    const normalizedVariance = (variance / tierSize) * tierWeight;
    totalImbalance += normalizedVariance;

    // Check for quality concentration
    if (tierSize >= 3) {
      const ratings = players.map(p => p.threeLayerRating).sort((a, b) => a - b);
      const spread = ratings[ratings.length - 1] - ratings[0];

      if (spread > 1.5) {
        // Sort players by rating to identify bottom players
        const sortedPlayers = [...players].sort((a, b) => a.threeLayerRating - b.threeLayerRating);
        const bottomPlayers = sortedPlayers.slice(0, 2); // Bottom 2 players

        // Count how many bottom players each team has
        const blueBottomCount = bottomPlayers.filter(p => blueTeam.includes(p)).length;
        const orangeBottomCount = bottomPlayers.filter(p => orangeTeam.includes(p)).length;

        // Penalize if one team has MAJORITY of bottom players (not just all)
        // For 2 bottom players: majority = 2 (100%)
        // For 3+ bottom players: majority = 67% (e.g., 2 of 3, 3 of 4)
        const bottomMajority = bottomPlayers.length > 2 ? Math.ceil(bottomPlayers.length * 0.67) : 2;

        if (blueBottomCount >= bottomMajority || orangeBottomCount >= bottomMajority) {
          // Scale penalty by how concentrated the bottom players are
          const concentrationRatio = Math.max(blueBottomCount, orangeBottomCount) / bottomPlayers.length;
          const concentrationPenalty = spread * 0.5 * concentrationRatio * tierWeight; // Apply tier weight
          totalImbalance += concentrationPenalty;
        }
      }
    }

    tierCount++;
  });

  // Add cascading tier imbalance penalty
  // Check for 2+ consecutive tiers favoring the same team
  const sortedTiers = Array.from(tierPlayers.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedTiers.length - 1; i++) {
    const currentTier = sortedTiers[i];
    const nextTier = sortedTiers[i + 1];

    const currentImbalance = (blueTierCounts.get(currentTier) || 0) - (orangeTierCounts.get(currentTier) || 0);
    const nextImbalance = (blueTierCounts.get(nextTier) || 0) - (orangeTierCounts.get(nextTier) || 0);

    // Both favor same team AND combined imbalance >= 2
    if (Math.sign(currentImbalance) === Math.sign(nextImbalance) && Math.sign(currentImbalance) !== 0) {
      const totalImbalanceMagnitude = Math.abs(currentImbalance + nextImbalance);
      if (totalImbalanceMagnitude >= 2) {
        // Penalty for clustering: increases with magnitude
        const clusteringPenalty = totalImbalanceMagnitude * 0.15;
        totalImbalance += clusteringPenalty;
      }
    }
  }

  // Return average imbalance across all tiers
  return tierCount > 0 ? totalImbalance / tierCount : 0;
}

/**
 * Calculate performance gap score (win rate + goal differential)
 * Lower scores are better (0 = no gap)
 */
function calculatePerformanceGap(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[]): number {
  // Win rate gap (percentage points)
  const blueWinRate = blueTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / blueTeam.length;
  const orangeWinRate = orangeTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / orangeTeam.length;
  const winRateGap = Math.abs(blueWinRate - orangeWinRate);

  // Goal differential gap (absolute difference)
  const blueGoalDiff = blueTeam.reduce((sum, p) => sum + (p.goal_differential ?? 0), 0);
  const orangeGoalDiff = orangeTeam.reduce((sum, p) => sum + (p.goal_differential ?? 0), 0);
  const goalDiffGap = Math.abs(blueGoalDiff - orangeGoalDiff);

  // Normalize goal diff gap to 0-10 scale (typical range is 0-50)
  const normalizedGoalDiff = Math.min(goalDiffGap / 5, 10);

  // Combine: win rate gap (0-50 scale) + normalized goal diff (0-10 scale)
  // Weight win rate more heavily (70/30 split)
  return (winRateGap * 0.7) + (normalizedGoalDiff * 0.3);
}

/**
 * Calculate systematic bias score (cross-category dominance)
 * Detects when one team consistently wins across multiple categories
 * Lower scores are better (0 = balanced, 1 = total dominance)
 */
function calculateSystematicBias(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: string[]
): number {
  let blueWins = 0;
  let orangeWins = 0;
  const SKILL_THRESHOLD = 0.05;      // Min difference to count as a "win"
  const ATTRIBUTE_THRESHOLD = 0.3;   // Min difference to count as a "win"

  // Count skill category wins (4 categories: Attack, Defense, Game IQ, GK)
  // Calculate signed differences (Blue - Orange, negative = Blue better, positive = Orange better)

  // Identify permanent goalkeepers in each team
  const bluePermanentGKs = blueTeam.filter(p => permanentGKIds.includes(p.player_id));
  const orangePermanentGKs = orangeTeam.filter(p => permanentGKIds.includes(p.player_id));

  // Calculate outfield players (excluding permanent GKs)
  const blueOutfield = blueTeam.filter(p => !permanentGKIds.includes(p.player_id));
  const orangeOutfield = orangeTeam.filter(p => !permanentGKIds.includes(p.player_id));

  // For attack and defense: use outfield players only (or full team if no outfield players)
  const bluePlayersForOutfield = blueOutfield.length > 0 ? blueOutfield : blueTeam;
  const orangePlayersForOutfield = orangeOutfield.length > 0 ? orangeOutfield : orangeTeam;

  // Calculate average ratings
  const blueAttack = bluePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeAttack = orangePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangePlayersForOutfield.length;

  const blueDefense = bluePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeDefense = orangePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangePlayersForOutfield.length;

  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  const blueGk = bluePermanentGKs.length > 0
    ? Math.max(...bluePermanentGKs.map(p => p.gk_rating ?? 5))
    : blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;

  const orangeGk = orangePermanentGKs.length > 0
    ? Math.max(...orangePermanentGKs.map(p => p.gk_rating ?? 5))
    : orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  // Calculate signed differences (Orange - Blue, positive = Orange better, negative = Blue better)
  const attackDiff = orangeAttack - blueAttack;
  const defenseDiff = orangeDefense - blueDefense;
  const gameIqDiff = orangeGameIq - blueGameIq;
  const gkDiff = orangeGk - blueGk;

  // Attack: positive = Orange better
  if (attackDiff > SKILL_THRESHOLD) orangeWins++;
  else if (attackDiff < -SKILL_THRESHOLD) blueWins++;

  // Defense: positive = Orange better
  if (defenseDiff > SKILL_THRESHOLD) orangeWins++;
  else if (defenseDiff < -SKILL_THRESHOLD) blueWins++;

  // Game IQ: positive = Orange better
  if (gameIqDiff > SKILL_THRESHOLD) orangeWins++;
  else if (gameIqDiff < -SKILL_THRESHOLD) blueWins++;

  // GK: positive = Orange better
  if (gkDiff > SKILL_THRESHOLD) orangeWins++;
  else if (gkDiff < -SKILL_THRESHOLD) blueWins++;

  // Count attribute category wins (6 categories)
  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  // Only count attribute wins if both teams have attributes
  if (blueAttrs.hasAttributes && orangeAttrs.hasAttributes) {
    // Calculate signed differences (Orange - Blue, scaled 0-10)
    // Positive = Orange better, negative = Blue better
    const paceDiff = (orangeAttrs.pace - blueAttrs.pace) * 10;
    const shootingDiff = (orangeAttrs.shooting - blueAttrs.shooting) * 10;
    const passingDiff = (orangeAttrs.passing - blueAttrs.passing) * 10;
    const dribblingDiff = (orangeAttrs.dribbling - blueAttrs.dribbling) * 10;
    const defendingDiff = (orangeAttrs.defending - blueAttrs.defending) * 10;
    const physicalDiff = (orangeAttrs.physical - blueAttrs.physical) * 10;

    // Count wins for each attribute
    if (Math.abs(paceDiff) > ATTRIBUTE_THRESHOLD) {
      if (paceDiff > 0) orangeWins++;
      else blueWins++;
    }
    if (Math.abs(shootingDiff) > ATTRIBUTE_THRESHOLD) {
      if (shootingDiff > 0) orangeWins++;
      else blueWins++;
    }
    if (Math.abs(passingDiff) > ATTRIBUTE_THRESHOLD) {
      if (passingDiff > 0) orangeWins++;
      else blueWins++;
    }
    if (Math.abs(dribblingDiff) > ATTRIBUTE_THRESHOLD) {
      if (dribblingDiff > 0) orangeWins++;
      else blueWins++;
    }
    if (Math.abs(defendingDiff) > ATTRIBUTE_THRESHOLD) {
      if (defendingDiff > 0) orangeWins++;
      else blueWins++;
    }
    if (Math.abs(physicalDiff) > ATTRIBUTE_THRESHOLD) {
      if (physicalDiff > 0) orangeWins++;
      else blueWins++;
    }
  }

  // Calculate bias score
  // Total categories: 4 skills + 6 attributes = 10
  // Ideal: 5-5 split (bias = 0)
  // Max dominance: 10-0 split (bias = 0.5)
  const totalCategories = 10;
  const maxWins = Math.max(blueWins, orangeWins);
  const bias = Math.max(0, (maxWins / totalCategories) - 0.5);  // 5/10 = 0, 10/10 = 0.5

  return bias;
}

/**
 * Calculate position balance score for SA optimization (Phase 2)
 * Returns a penalty score based on position distribution imbalance
 * Lower is better (0 = perfectly balanced positions)
 */
function calculatePositionBalanceScore(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[]
): number {
  // Convert to PlayerWithPositions format for position balance utilities
  // These functions only use id, friendly_name, positions, and primaryPosition
  const bluePositions: PlayerWithPositions[] = blueTeam.map(p => ({
    id: p.player_id,
    friendly_name: p.friendly_name,
    positions: p.positions,
    primaryPosition: p.primaryPosition as PlayerWithPositions['primaryPosition']
  }));
  const orangePositions: PlayerWithPositions[] = orangeTeam.map(p => ({
    id: p.player_id,
    friendly_name: p.friendly_name,
    positions: p.positions,
    primaryPosition: p.primaryPosition as PlayerWithPositions['primaryPosition']
  }));

  // Use existing position balance utilities
  const comparison = comparePositionBalance(bluePositions, orangePositions);

  // Category gap penalty (0.3 per player difference in Defenders/Midfielders/Attackers)
  const categoryPenalty = (
    comparison.defenders.gap * 0.3 +
    comparison.midfielders.gap * 0.3 +
    comparison.attackers.gap * 0.3
  );

  // Individual position gaps (RWB, CM, ST, etc.)
  const individualBalance = checkIndividualPositionBalance(bluePositions, orangePositions);
  const individualPenalty = individualBalance.maxGap * 0.2;

  // CRITICAL: Striker-specific severe penalty
  // One team having 0 strikers when 2+ exist is catastrophic for gameplay
  const blueStrikers = blueTeam.filter(p => p.primaryPosition === 'ST').length;
  const orangeStrikers = orangeTeam.filter(p => p.primaryPosition === 'ST').length;
  let strikerPenalty = 0;
  if ((blueStrikers === 0 && orangeStrikers >= 2) ||
      (orangeStrikers === 0 && blueStrikers >= 2)) {
    strikerPenalty = 0.5; // Heavy penalty - SA should strongly avoid this
  } else if (Math.abs(blueStrikers - orangeStrikers) >= 2) {
    strikerPenalty = 0.3; // Moderate penalty for 2+ striker gap
  }

  return categoryPenalty + individualPenalty + strikerPenalty;
}

// ============================================================================
// CHEMISTRY BALANCE CALCULATION (Objective #9) - Added Dec 2025
// ============================================================================

/**
 * Chemistry balance configuration
 */
const CHEMISTRY_CONFIG = {
  /** Default chemistry score for pairs with no history (neutral value) */
  DEFAULT_SCORE: 35,
  /** High chemistry threshold - pairs above this are considered "established" */
  HIGH_CHEMISTRY_THRESHOLD: 50,
  /** Maximum theoretical chemistry score per pair (for normalization) */
  MAX_PAIR_CHEMISTRY: 83,
  /** Difference in total chemistry that is considered "significant" */
  SIGNIFICANT_DIFFERENCE: 500,
};

/**
 * Team chemistry calculation result
 */
interface TeamChemistryResult {
  /** Total chemistry score (sum of all pair chemistry scores) */
  total: number;
  /** Number of pairs calculated */
  pairCount: number;
  /** Average chemistry per pair */
  avgPerPair: number;
  /** Number of high-chemistry pairs (above threshold) */
  highChemistryPairs: number;
}

/**
 * Calculate total intra-team chemistry score
 * Sums chemistry scores for all N*(N-1)/2 pairs within a team
 *
 * @param team - Array of players on the team
 * @param chemistryLookup - Map of pair keys to chemistry scores (optional)
 * @returns Total chemistry score and related statistics
 */
function calculateTeamChemistry(
  team: PlayerWithRating[],
  chemistryLookup?: Map<string, number>
): TeamChemistryResult {
  if (team.length < 2) {
    return { total: 0, pairCount: 0, avgPerPair: 0, highChemistryPairs: 0 };
  }

  let total = 0;
  let pairCount = 0;
  let highChemistryPairs = 0;

  // Calculate chemistry for all pairs within the team
  for (let i = 0; i < team.length; i++) {
    for (let j = i + 1; j < team.length; j++) {
      // Generate consistent key (smaller ID first)
      const id1 = team[i].player_id;
      const id2 = team[j].player_id;
      const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;

      // Get chemistry score from lookup or use default
      const chemScore = chemistryLookup?.get(key) ?? CHEMISTRY_CONFIG.DEFAULT_SCORE;
      total += chemScore;
      pairCount++;

      if (chemScore >= CHEMISTRY_CONFIG.HIGH_CHEMISTRY_THRESHOLD) {
        highChemistryPairs++;
      }
    }
  }

  return {
    total,
    pairCount,
    avgPerPair: pairCount > 0 ? total / pairCount : 0,
    highChemistryPairs,
  };
}

/**
 * Calculate chemistry balance score for multi-objective optimization
 * Returns normalized difference between team chemistry totals (0-1 scale)
 * Lower is better (0 = perfectly balanced)
 *
 * @param blueTeam - Blue team players
 * @param orangeTeam - Orange team players
 * @param chemistryLookup - Map of pair keys to chemistry scores (optional)
 * @returns Normalized chemistry imbalance score (0-1)
 */
function calculateChemistryBalance(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  chemistryLookup?: Map<string, number>
): number {
  // If no chemistry data provided, return 0 (neutral - no penalty or bonus)
  if (!chemistryLookup || chemistryLookup.size === 0) {
    return 0;
  }

  const blueChemistry = calculateTeamChemistry(blueTeam, chemistryLookup);
  const orangeChemistry = calculateTeamChemistry(orangeTeam, chemistryLookup);

  // Calculate raw difference in total team chemistry
  const rawDiff = Math.abs(blueChemistry.total - orangeChemistry.total);

  // Normalize to 0-1 scale
  // A difference of SIGNIFICANT_DIFFERENCE (500) is considered maximum imbalance
  return Math.min(rawDiff / CHEMISTRY_CONFIG.SIGNIFICANT_DIFFERENCE, 1.0);
}

/**
 * Calculate multi-objective score for team composition
 * Returns scores for all 9 objectives plus weighted overall score
 */
function calculateMultiObjectiveScore(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds?: string[],
  weights: OptimizationWeights = DEFAULT_WEIGHTS,
  chemistryLookup?: Map<string, number>
): MultiObjectiveScore {
  // 1. Skills Balance (max difference across Attack/Defense/Game IQ/GK)
  const detailedScore = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);
  const skillsBalance = detailedScore.skillBalance;

  // 2. Shooting Balance (distribution imbalance)
  const allPlayers = [...blueTeam, ...orangeTeam];
  const shootingDistribution = analyzeShootingDistribution(allPlayers);
  const shootingBalance = calculateShootingImbalance(blueTeam, orangeTeam, shootingDistribution);

  // 3. Attribute Balance (average difference in 6 derived attributes)
  const attributeBalance = calculateAttributeBalanceScore(blueTeam, orangeTeam);

  // 4. Tier Fairness (distribution variance + quality concentration)
  const tierFairness = calculateTierFairness(blueTeam, orangeTeam);

  // 5. Performance Gap (win rate + goal differential)
  const performanceGap = calculatePerformanceGap(blueTeam, orangeTeam);

  // 6. Core Skill Dominance (Jan 2026: penalty when one team wins 0/3 core skills)
  // This ensures SA actively avoids solutions where one team dominates Attack/Defense/Game IQ
  const gkIdSet = new Set(permanentGKIds ?? []);
  const coreStatus = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);
  // Penalty scale: 0 = balanced (1-1 or 1-2), 0.5 = dominated (0-2 or 0-3)
  const coreSkillDominance = coreStatus.isCoreSkillDominated ? 0.5 : 0;

  // 7. Systematic Bias (cross-category dominance)
  const systematicBias = calculateSystematicBias(blueTeam, orangeTeam, permanentGKIds ?? []);

  // 8. Position Balance (Phase 2: prevents striker imbalance during SA)
  const positionBalance = calculatePositionBalanceScore(blueTeam, orangeTeam);

  // 9. Average Rating Balance (Phase 3: ensures similar team quality)
  const blueAvgRating = blueTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueTeam.length;
  const orangeAvgRating = orangeTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeTeam.length;
  const avgRatingBalance = Math.abs(blueAvgRating - orangeAvgRating);

  // 10. Chemistry Balance (Dec 2025: balance intra-team chemistry)
  const chemistryBalance = calculateChemistryBalance(blueTeam, orangeTeam, chemistryLookup);

  // Calculate weighted overall score (now 10 objectives)
  const overall =
    (skillsBalance * weights.skillsBalance) +
    (shootingBalance * weights.shootingBalance) +
    (attributeBalance * weights.attributeBalance) +
    (tierFairness * weights.tierFairness) +
    (performanceGap * weights.performanceGap) +
    (coreSkillDominance * weights.coreSkillDominance) +
    (systematicBias * weights.systematicBias) +
    (positionBalance * weights.positionBalance) +
    (avgRatingBalance * weights.avgRatingBalance) +
    (chemistryBalance * weights.chemistryBalance);

  return {
    skillsBalance,
    shootingBalance,
    attributeBalance,
    tierFairness,
    performanceGap,
    coreSkillDominance,
    systematicBias,
    positionBalance,
    avgRatingBalance,
    chemistryBalance,
    overall,
  };
}

/**
 * Evaluate if a swap improves the multi-objective score
 * A swap is beneficial if it improves 2+ objectives without worsening others by >20%
 */
function evaluateSwap(
  scoreBefore: MultiObjectiveScore,
  scoreAfter: MultiObjectiveScore,
  beforeBlueTeam: PlayerWithRating[],
  beforeOrangeTeam: PlayerWithRating[],
  afterBlueTeam: PlayerWithRating[],
  afterOrangeTeam: PlayerWithRating[],
  weights: OptimizationWeights = DEFAULT_WEIGHTS
): SwapEvaluation {
  const objectives = [
    'skillsBalance',
    'shootingBalance',
    'attributeBalance',
    'tierFairness',
    'performanceGap',
    'coreSkillDominance',  // Jan 2026: track core skill dominance penalty
    'systematicBias',
    'positionBalance',
    'avgRatingBalance',
    'chemistryBalance'  // Dec 2025: track chemistry balance
  ] as const;

  const improvedObjectives: string[] = [];
  const worsenedObjectives: string[] = [];
  const WORSENING_THRESHOLD = 0.20; // 20% threshold

  objectives.forEach(obj => {
    const before = scoreBefore[obj];
    const after = scoreAfter[obj];
    const change = after - before;
    const percentChange = before > 0 ? (change / before) : 0;

    if (change < -0.01) {
      // Improved (lower is better)
      improvedObjectives.push(obj);
    } else if (percentChange > WORSENING_THRESHOLD) {
      // Worsened by more than threshold
      worsenedObjectives.push(obj);
    }
  });

  // PHASE 5: Calculate soft penalties for constraint violations
  const penalties = calculateSwapPenalties(
    beforeBlueTeam,
    beforeOrangeTeam,
    afterBlueTeam,
    afterOrangeTeam
  );

  // Net improvement = score improvement - (penalty increase × weight factor)
  // Penalty weight factor: 0.35 means penalties are 35% as important as objective scores
  // Increased from 0.25 to better enforce elite shooter and skill balance constraints
  const PENALTY_WEIGHT = 0.35;
  const scoreImprovement = scoreBefore.overall - scoreAfter.overall; // Positive = better
  const netImprovement = scoreImprovement - (penalties.totalPenalty * PENALTY_WEIGHT);

  // Calculate systematic bias improvement
  const biasImprovement = scoreBefore.systematicBias - scoreAfter.systematicBias; // Positive = better
  const significantBiasReduction = biasImprovement > 0.1; // 20% reduction in bias (0.5 max → 0.1 threshold)

  // Accept swap if:
  // 1. Improves 2+ objectives AND doesn't worsen any by >20% AND penalties are not severe (< 10.0), OR
  // 2. Net improvement (including penalties) is positive AND > 5% of before score, OR
  // 3. Significantly reduces systematic bias (>0.1) even if small net cost (<2% of before score)
  const severePenalties = penalties.totalPenalty > 10.0;
  const isImprovement =
    (improvedObjectives.length >= 2 && worsenedObjectives.length === 0 && !severePenalties) ||
    (netImprovement > 0 && netImprovement / scoreBefore.overall > 0.05) ||
    (significantBiasReduction && netImprovement > -0.02);

  return {
    isImprovement,
    improvedObjectives,
    worsenedObjectives,
    scoreBefore,
    scoreAfter,
    netImprovement,
  };
}

// ============================================================================
// PHASE 4: MULTI-SWAP COMBINATIONS
// ============================================================================

/**
 * Analyze a swap to categorize what it improves/worsens
 */
function analyzeSwapCharacteristics(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  swap: {
    tier: number;
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
  },
  permanentGKIds: string[]
): {
  improvesAttack: boolean;
  improvesDefense: boolean;
  improvesAttributes: boolean;
  worsensAttack: boolean;
  worsensDefense: boolean;
  worsensAttributes: boolean;
} {
  // Simulate the swap
  const testBlue = blueTeam.map(p => p.player_id === swap.bluePlayer.player_id ? swap.orangePlayer : p);
  const testOrange = orangeTeam.map(p => p.player_id === swap.orangePlayer.player_id ? swap.bluePlayer : p);

  const scoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKIds);
  const scoreAfter = calculateMultiObjectiveScore(testBlue, testOrange, permanentGKIds);

  const attackChange = scoreAfter.skillsBalance - scoreBefore.skillsBalance;
  const attributeChange = scoreAfter.attributeBalance - scoreBefore.attributeBalance;

  // Calculate defense-specific change
  const blueDefBefore = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
  const orangeDefBefore = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;
  const defGapBefore = Math.abs(blueDefBefore - orangeDefBefore);

  const blueDefAfter = testBlue.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / testBlue.length;
  const orangeDefAfter = testOrange.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / testOrange.length;
  const defGapAfter = Math.abs(blueDefAfter - orangeDefAfter);

  const defenseChange = defGapAfter - defGapBefore;

  return {
    improvesAttack: attackChange < -0.05,
    improvesDefense: defenseChange < -0.05,
    improvesAttributes: attributeChange < -0.1,
    worsensAttack: attackChange > 0.05,
    worsensDefense: defenseChange > 0.05,
    worsensAttributes: attributeChange > 0.1,
  };
}

/**
 * Generate candidate swap pairs from a list of potential swaps
 * Uses smart pairing to match complementary swaps
 * @param candidates Top N single-swap candidates sorted by improvement
 * @param maxPairs Maximum number of pairs to generate (default: 500)
 * @returns Array of non-overlapping swap pairs
 */
function generateSwapPairs(
  candidates: Array<{
    tier: number;
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    improvement: number;
  }>,
  maxPairs: number = 500,  // INCREASED from 150 to 500 for much better exploration
  blueTeam?: PlayerWithRating[],
  orangeTeam?: PlayerWithRating[],
  permanentGKIds?: string[]
): Array<{
  swap1: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  swap2: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
}> {
  const pairs: Array<{
    swap1: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
    swap2: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  }> = [];

  // If we have team context, use smart pairing
  if (blueTeam && orangeTeam && permanentGKIds) {
    // Analyze each candidate
    const analyzedCandidates = candidates.map(swap => ({
      ...swap,
      characteristics: analyzeSwapCharacteristics(blueTeam, orangeTeam, swap, permanentGKIds)
    }));

    // Try to pair complementary swaps
    for (let i = 0; i < analyzedCandidates.length && pairs.length < maxPairs; i++) {
      const swap1 = analyzedCandidates[i];

      for (let j = i + 1; j < analyzedCandidates.length && pairs.length < maxPairs; j++) {
        const swap2 = analyzedCandidates[j];

        // Check for overlapping players
        const playersInSwap1 = [swap1.bluePlayer.player_id, swap1.orangePlayer.player_id];
        const playersInSwap2 = [swap2.bluePlayer.player_id, swap2.orangePlayer.player_id];
        const hasOverlap = playersInSwap1.some(id => playersInSwap2.includes(id));

        if (hasOverlap) continue;

        // Check if swaps are complementary:
        // - One improves what the other worsens
        // - This creates emergent balance
        const isComplementary =
          (swap1.characteristics.improvesAttack && swap2.characteristics.worsensAttack) ||
          (swap1.characteristics.worsensAttack && swap2.characteristics.improvesAttack) ||
          (swap1.characteristics.improvesDefense && swap2.characteristics.worsensDefense) ||
          (swap1.characteristics.worsensDefense && swap2.characteristics.improvesDefense) ||
          (swap1.characteristics.improvesAttributes && swap2.characteristics.worsensAttributes) ||
          (swap1.characteristics.worsensAttributes && swap2.characteristics.improvesAttributes);

        // Prioritize complementary pairs
        if (isComplementary || pairs.length < maxPairs * 0.7) {
          pairs.push({
            swap1: {
              tier: swap1.tier,
              bluePlayer: swap1.bluePlayer,
              orangePlayer: swap1.orangePlayer,
            },
            swap2: {
              tier: swap2.tier,
              bluePlayer: swap2.bluePlayer,
              orangePlayer: swap2.orangePlayer,
            },
          });
        }
      }
    }
  } else {
    // Fallback to original random pairing
    for (let i = 0; i < candidates.length && pairs.length < maxPairs; i++) {
      for (let j = i + 1; j < candidates.length && pairs.length < maxPairs; j++) {
        const swap1 = candidates[i];
        const swap2 = candidates[j];

        const playersInSwap1 = [swap1.bluePlayer.player_id, swap1.orangePlayer.player_id];
        const playersInSwap2 = [swap2.bluePlayer.player_id, swap2.orangePlayer.player_id];
        const hasOverlap = playersInSwap1.some(id => playersInSwap2.includes(id));

        if (!hasOverlap) {
          pairs.push({
            swap1: {
              tier: swap1.tier,
              bluePlayer: swap1.bluePlayer,
              orangePlayer: swap1.orangePlayer,
            },
            swap2: {
              tier: swap2.tier,
              bluePlayer: swap2.bluePlayer,
              orangePlayer: swap2.orangePlayer,
            },
          });
        }
      }
    }
  }

  return pairs;
}

/**
 * Evaluate a pair of swaps to see if they produce emergent benefits
 * @returns SwapPair with combined evaluation, or null if not beneficial
 */
function evaluateSwapPair(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  swap1: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating },
  swap2: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating },
  permanentGKIds: Set<string>,
  debugLog: string[]
): SwapPair | null {
  // Clone teams and apply both swaps
  let testBlue = [...blueTeam];
  let testOrange = [...orangeTeam];

  // Apply swap 1
  const blueIdx1 = testBlue.findIndex(p => p.player_id === swap1.bluePlayer.player_id);
  const orangeIdx1 = testOrange.findIndex(p => p.player_id === swap1.orangePlayer.player_id);
  if (blueIdx1 === -1 || orangeIdx1 === -1) return null;

  [testBlue[blueIdx1], testOrange[orangeIdx1]] = [testOrange[orangeIdx1], testBlue[blueIdx1]];

  // Apply swap 2
  const blueIdx2 = testBlue.findIndex(p => p.player_id === swap2.bluePlayer.player_id);
  const orangeIdx2 = testOrange.findIndex(p => p.player_id === swap2.orangePlayer.player_id);
  if (blueIdx2 === -1 || orangeIdx2 === -1) return null;

  [testBlue[blueIdx2], testOrange[orangeIdx2]] = [testOrange[orangeIdx2], testBlue[blueIdx2]];

  // Calculate scores before and after
  const permanentGKArray = Array.from(permanentGKIds);
  const scoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKArray);
  const scoreAfter = calculateMultiObjectiveScore(testBlue, testOrange, permanentGKArray);

  // Evaluate the combined swap
  const evaluation = evaluateSwap(
    scoreBefore,
    scoreAfter,
    blueTeam,
    orangeTeam,
    testBlue,
    testOrange
  );

  // Only return if it's an improvement
  if (!evaluation.isImprovement) return null;

  // Calculate priority score (higher is better)
  const skillImprovement = scoreBefore.skillsBalance - scoreAfter.skillsBalance;
  const shootingImprovement = scoreBefore.shootingBalance - scoreAfter.shootingBalance;
  const overallImprovement = scoreBefore.overall - scoreAfter.overall;

  const priority =
    (skillImprovement * 0.30) +
    (shootingImprovement * 0.30) +
    (overallImprovement * 0.40);

  return {
    swap1: {
      tier: swap1.tier,
      teamA: 'blue',
      playerA: swap1.bluePlayer,
      teamB: 'orange',
      playerB: swap1.orangePlayer,
    },
    swap2: {
      tier: swap2.tier,
      teamA: 'blue',
      playerA: swap2.bluePlayer,
      teamB: 'orange',
      playerB: swap2.orangePlayer,
    },
    combinedImprovement: overallImprovement,
    scoreBefore,
    scoreAfter,
    evaluation,
    priority,
  };
}

/**
 * Execute multi-swap optimization round
 * Tries pairs of swaps simultaneously to escape local optima
 * @returns true if at least one beneficial pair swap was made
 */
function executeMultiSwapOptimization(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  tiers: Map<number, PlayerWithRating[]>,
  permanentGKIds: Set<string>,
  currentBalance: number,
  threshold: number,
  debugLog: string[]
): { swapMade: boolean; newBalance: number } {
  debugLog.push('\n--- MULTI-SWAP OPTIMIZATION ROUND ---');
  debugLog.push(`Current Balance: ${currentBalance.toFixed(3)}`);
  debugLog.push(`Threshold: ${threshold.toFixed(3)}`);

  // Step 1: Generate candidate single swaps (top 50 by improvement)
  const candidates: Array<{
    tier: number;
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    improvement: number;
  }> = [];

  tiers.forEach((tierPlayers, tierNum) => {
    const bluePlayers = blueTeam.filter(p => p.tier === tierNum);
    const orangePlayers = orangeTeam.filter(p => p.tier === tierNum);

    bluePlayers.forEach(blueP => {
      // Skip permanent GKs
      if (permanentGKIds.has(blueP.player_id)) return;

      orangePlayers.forEach(orangeP => {
        if (permanentGKIds.has(orangeP.player_id)) return;

        // Simulate swap
        const testBlue = blueTeam.map(p =>
          p.player_id === blueP.player_id ? orangeP : p
        );
        const testOrange = orangeTeam.map(p =>
          p.player_id === orangeP.player_id ? blueP : p
        );

        const permanentGKArray = Array.from(permanentGKIds);
        const scoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKArray);
        const scoreAfter = calculateMultiObjectiveScore(testBlue, testOrange, permanentGKArray);
        const improvement = scoreBefore.overall - scoreAfter.overall;

        // PHASE 4 FIX: Include ALL swaps, not just improving ones
        // Pairs might create emergent benefits even if individual swaps worsen things
        candidates.push({
          tier: tierNum,
          bluePlayer: blueP,
          orangePlayer: orangeP,
          improvement,
        });
      });
    });
  });

  // Sort by absolute improvement magnitude to get diverse candidates
  // Take top 75 best + top 75 worst = 150 total diverse candidates (INCREASED for better exploration)
  candidates.sort((a, b) => Math.abs(b.improvement) - Math.abs(a.improvement));

  // Get top improving and top worsening swaps for diversity
  const improvingSwaps = candidates.filter(c => c.improvement > 0).slice(0, 75);
  const worseningSwaps = candidates.filter(c => c.improvement <= 0).slice(0, 75);
  const topCandidates = [...improvingSwaps, ...worseningSwaps];

  debugLog.push(`\nGenerated ${topCandidates.length} single-swap candidates`);
  debugLog.push(`  - ${improvingSwaps.length} improving swaps (best: ${improvingSwaps[0]?.improvement.toFixed(3) ?? 'N/A'})`);
  debugLog.push(`  - ${worseningSwaps.length} worsening swaps (worst: ${worseningSwaps[0]?.improvement.toFixed(3) ?? 'N/A'})`);
  debugLog.push(`Strategy: Try pairs that combine opposing effects for emergent benefits`);

  if (topCandidates.length < 2) {
    debugLog.push('Not enough candidates for pair swaps');
    return { swapMade: false, newBalance: currentBalance };
  }

  // Step 2: Generate swap pairs with smart pairing
  const permanentGKArray = Array.from(permanentGKIds);
  const swapPairs = generateSwapPairs(topCandidates, 500, blueTeam, orangeTeam, permanentGKArray); // INCREASED from 150 to 500
  debugLog.push(`Generated ${swapPairs.length} potential swap pairs (using smart complementary pairing)`);

  // Step 3: Evaluate pairs and find best one
  const evaluatedPairs: SwapPair[] = [];

  for (const pair of swapPairs) {
    const evaluated = evaluateSwapPair(
      blueTeam,
      orangeTeam,
      pair.swap1,
      pair.swap2,
      permanentGKIds,
      debugLog
    );

    if (evaluated) {
      evaluatedPairs.push(evaluated);
    }
  }

  debugLog.push(`Found ${evaluatedPairs.length} beneficial swap pairs`);

  if (evaluatedPairs.length === 0) {
    debugLog.push('No beneficial swap pairs found');

    // Try 3-way swaps as a last resort
    if (topCandidates.length >= 10) {
      debugLog.push('\nAttempting 3-way swap combinations...');
      const swapTriples = generateSwapTriples(topCandidates, 150); // INCREASED from 50 to 150
      debugLog.push(`Generated ${swapTriples.length} potential swap triples`);

      const evaluatedTriples: Array<{
        swap1: any;
        swap2: any;
        swap3: any;
        combinedImprovement: number;
        scoreBefore: MultiObjectiveScore;
        scoreAfter: MultiObjectiveScore;
        evaluation: SwapEvaluation;
        priority: number;
      }> = [];

      for (const triple of swapTriples) {
        const evaluated = evaluateSwapTriple(
          blueTeam,
          orangeTeam,
          triple.swap1,
          triple.swap2,
          triple.swap3,
          permanentGKIds,
          debugLog
        );

        if (evaluated) {
          evaluatedTriples.push(evaluated);
        }
      }

      debugLog.push(`Found ${evaluatedTriples.length} beneficial swap triples`);

      if (evaluatedTriples.length > 0) {
        // Sort by priority and take the best
        evaluatedTriples.sort((a, b) => b.priority - a.priority);
        const bestTriple = evaluatedTriples[0];

        // Execute the best triple swap
        debugLog.push(`\nExecuting best swap triple:`);
        debugLog.push(`  Swap 1: ${bestTriple.swap1.playerA.friendly_name} (Blue) ↔ ${bestTriple.swap1.playerB.friendly_name} (Orange)`);
        debugLog.push(`  Swap 2: ${bestTriple.swap2.playerA.friendly_name} (Blue) ↔ ${bestTriple.swap2.playerB.friendly_name} (Orange)`);
        debugLog.push(`  Swap 3: ${bestTriple.swap3.playerA.friendly_name} (Blue) ↔ ${bestTriple.swap3.playerB.friendly_name} (Orange)`);
        debugLog.push(`  Combined Improvement: ${bestTriple.combinedImprovement.toFixed(3)}`);
        debugLog.push(`  Priority Score: ${bestTriple.priority.toFixed(3)}`);

        // Apply swap 1
        const blueIdx1 = blueTeam.findIndex(p => p.player_id === bestTriple.swap1.playerA.player_id);
        const orangeIdx1 = orangeTeam.findIndex(p => p.player_id === bestTriple.swap1.playerB.player_id);
        [blueTeam[blueIdx1], orangeTeam[orangeIdx1]] = [orangeTeam[orangeIdx1], blueTeam[blueIdx1]];

        // Apply swap 2
        const blueIdx2 = blueTeam.findIndex(p => p.player_id === bestTriple.swap2.playerA.player_id);
        const orangeIdx2 = orangeTeam.findIndex(p => p.player_id === bestTriple.swap2.playerB.player_id);
        [blueTeam[blueIdx2], orangeTeam[orangeIdx2]] = [orangeTeam[orangeIdx2], blueTeam[blueIdx2]];

        // Apply swap 3
        const blueIdx3 = blueTeam.findIndex(p => p.player_id === bestTriple.swap3.playerA.player_id);
        const orangeIdx3 = orangeTeam.findIndex(p => p.player_id === bestTriple.swap3.playerB.player_id);
        [blueTeam[blueIdx3], orangeTeam[orangeIdx3]] = [orangeTeam[orangeIdx3], blueTeam[blueIdx3]];

        const newBalance = bestTriple.scoreAfter.skillsBalance;
        debugLog.push(`  Balance: ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`);
        debugLog.push(`  Improved Objectives: ${bestTriple.evaluation.improvedObjectives.join(', ')}`);
        if (bestTriple.evaluation.worsenedObjectives.length > 0) {
          debugLog.push(`  Worsened Objectives: ${bestTriple.evaluation.worsenedObjectives.join(', ')}`);
        }

        return { swapMade: true, newBalance };
      }
    }

    debugLog.push('No beneficial swap combinations found');
    return { swapMade: false, newBalance: currentBalance };
  }

  // Sort by priority and take the best
  evaluatedPairs.sort((a, b) => b.priority - a.priority);
  const bestPair = evaluatedPairs[0];

  // Step 4: Execute the best pair swap
  debugLog.push(`\nExecuting best swap pair:`);
  debugLog.push(`  Swap 1: ${bestPair.swap1.playerA.friendly_name} (Blue) ↔ ${bestPair.swap1.playerB.friendly_name} (Orange)`);
  debugLog.push(`  Swap 2: ${bestPair.swap2.playerA.friendly_name} (Blue) ↔ ${bestPair.swap2.playerB.friendly_name} (Orange)`);
  debugLog.push(`  Combined Improvement: ${bestPair.combinedImprovement.toFixed(3)}`);
  debugLog.push(`  Priority Score: ${bestPair.priority.toFixed(3)}`);

  // Apply swap 1
  const blueIdx1 = blueTeam.findIndex(p => p.player_id === bestPair.swap1.playerA.player_id);
  const orangeIdx1 = orangeTeam.findIndex(p => p.player_id === bestPair.swap1.playerB.player_id);
  [blueTeam[blueIdx1], orangeTeam[orangeIdx1]] = [orangeTeam[orangeIdx1], blueTeam[blueIdx1]];

  // Apply swap 2
  const blueIdx2 = blueTeam.findIndex(p => p.player_id === bestPair.swap2.playerA.player_id);
  const orangeIdx2 = orangeTeam.findIndex(p => p.player_id === bestPair.swap2.playerB.player_id);
  [blueTeam[blueIdx2], orangeTeam[orangeIdx2]] = [orangeTeam[orangeIdx2], blueTeam[blueIdx2]];

  const newBalance = bestPair.scoreAfter.skillsBalance;
  debugLog.push(`  Balance: ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`);
  debugLog.push(`  Improved Objectives: ${bestPair.evaluation.improvedObjectives.join(', ')}`);
  if (bestPair.evaluation.worsenedObjectives.length > 0) {
    debugLog.push(`  Worsened Objectives: ${bestPair.evaluation.worsenedObjectives.join(', ')}`);
  }

  // Check if we should stop (balance reached threshold)
  if (newBalance <= threshold) {
    debugLog.push(`\n✓ Balance threshold reached (${newBalance.toFixed(3)} ≤ ${threshold.toFixed(3)})`);
  }

  return { swapMade: true, newBalance };
}

/**
 * Generate candidate swap triples from a list of potential swaps
 * @param candidates Top N single-swap candidates
 * @param maxTriples Maximum number of triples to generate (default: 50)
 * @returns Array of non-overlapping swap triples
 */
function generateSwapTriples(
  candidates: Array<{
    tier: number;
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    improvement: number;
  }>,
  maxTriples: number = 50
): Array<{
  swap1: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  swap2: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  swap3: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
}> {
  const triples: Array<{
    swap1: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
    swap2: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
    swap3: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  }> = [];

  // Generate triples from top candidates (more selective due to combinatorial explosion)
  for (let i = 0; i < Math.min(candidates.length, 15) && triples.length < maxTriples; i++) {
    for (let j = i + 1; j < Math.min(candidates.length, 20) && triples.length < maxTriples; j++) {
      for (let k = j + 1; k < Math.min(candidates.length, 25) && triples.length < maxTriples; k++) {
        const swap1 = candidates[i];
        const swap2 = candidates[j];
        const swap3 = candidates[k];

        // Check for overlapping players (can't swap same player multiple times)
        const playersInSwap1 = [swap1.bluePlayer.player_id, swap1.orangePlayer.player_id];
        const playersInSwap2 = [swap2.bluePlayer.player_id, swap2.orangePlayer.player_id];
        const playersInSwap3 = [swap3.bluePlayer.player_id, swap3.orangePlayer.player_id];

        const allPlayers = [...playersInSwap1, ...playersInSwap2, ...playersInSwap3];
        const uniquePlayers = new Set(allPlayers);

        // No overlap if all 6 player IDs are unique
        if (uniquePlayers.size === 6) {
          triples.push({
            swap1: {
              tier: swap1.tier,
              bluePlayer: swap1.bluePlayer,
              orangePlayer: swap1.orangePlayer,
            },
            swap2: {
              tier: swap2.tier,
              bluePlayer: swap2.bluePlayer,
              orangePlayer: swap2.orangePlayer,
            },
            swap3: {
              tier: swap3.tier,
              bluePlayer: swap3.bluePlayer,
              orangePlayer: swap3.orangePlayer,
            },
          });
        }
      }
    }
  }

  return triples;
}

/**
 * Evaluate a triple of swaps to see if they produce emergent benefits
 * @returns SwapTriple with combined evaluation, or null if not beneficial
 */
function evaluateSwapTriple(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  swap1: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating },
  swap2: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating },
  swap3: { tier: number; bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating },
  permanentGKIds: Set<string>,
  debugLog: string[]
): {
  swap1: any;
  swap2: any;
  swap3: any;
  combinedImprovement: number;
  scoreBefore: MultiObjectiveScore;
  scoreAfter: MultiObjectiveScore;
  evaluation: SwapEvaluation;
  priority: number;
} | null {
  // Clone teams and apply all three swaps
  let testBlue = [...blueTeam];
  let testOrange = [...orangeTeam];

  // Apply swap 1
  const blueIdx1 = testBlue.findIndex(p => p.player_id === swap1.bluePlayer.player_id);
  const orangeIdx1 = testOrange.findIndex(p => p.player_id === swap1.orangePlayer.player_id);
  if (blueIdx1 === -1 || orangeIdx1 === -1) return null;
  [testBlue[blueIdx1], testOrange[orangeIdx1]] = [testOrange[orangeIdx1], testBlue[blueIdx1]];

  // Apply swap 2
  const blueIdx2 = testBlue.findIndex(p => p.player_id === swap2.bluePlayer.player_id);
  const orangeIdx2 = testOrange.findIndex(p => p.player_id === swap2.orangePlayer.player_id);
  if (blueIdx2 === -1 || orangeIdx2 === -1) return null;
  [testBlue[blueIdx2], testOrange[orangeIdx2]] = [testOrange[orangeIdx2], testBlue[blueIdx2]];

  // Apply swap 3
  const blueIdx3 = testBlue.findIndex(p => p.player_id === swap3.bluePlayer.player_id);
  const orangeIdx3 = testOrange.findIndex(p => p.player_id === swap3.orangePlayer.player_id);
  if (blueIdx3 === -1 || orangeIdx3 === -1) return null;
  [testBlue[blueIdx3], testOrange[orangeIdx3]] = [testOrange[orangeIdx3], testBlue[blueIdx3]];

  // Calculate scores before and after
  const permanentGKArray = Array.from(permanentGKIds);
  const scoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKArray);
  const scoreAfter = calculateMultiObjectiveScore(testBlue, testOrange, permanentGKArray);

  // Evaluate the combined swap
  const evaluation = evaluateSwap(
    scoreBefore,
    scoreAfter,
    blueTeam,
    orangeTeam,
    testBlue,
    testOrange
  );

  // Only return if it's an improvement
  if (!evaluation.isImprovement) return null;

  // Calculate priority score (higher is better)
  const skillImprovement = scoreBefore.skillsBalance - scoreAfter.skillsBalance;
  const shootingImprovement = scoreBefore.shootingBalance - scoreAfter.shootingBalance;
  const overallImprovement = scoreBefore.overall - scoreAfter.overall;

  const priority =
    (skillImprovement * 0.30) +
    (shootingImprovement * 0.30) +
    (overallImprovement * 0.40);

  return {
    swap1: {
      tier: swap1.tier,
      teamA: 'blue',
      playerA: swap1.bluePlayer,
      teamB: 'orange',
      playerB: swap1.orangePlayer,
    },
    swap2: {
      tier: swap2.tier,
      teamA: 'blue',
      playerA: swap2.bluePlayer,
      teamB: 'orange',
      playerB: swap2.orangePlayer,
    },
    swap3: {
      tier: swap3.tier,
      teamA: 'blue',
      playerA: swap3.bluePlayer,
      teamB: 'orange',
      playerB: swap3.orangePlayer,
    },
    combinedImprovement: overallImprovement,
    scoreBefore,
    scoreAfter,
    evaluation,
    priority,
  };
}

/**
 * Find swaps that specifically target a problematic attribute
 * Returns the best swap that reduces the attribute gap, or null if none found
 */
function findAttributeTargetedSwap(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  attributeName: 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical',
  currentGap: number,
  permanentGKIds: Set<string> | string[],
  debugLog?: string[]
): {
  bluePlayer: PlayerWithRating;
  orangePlayer: PlayerWithRating;
  improvement: number;
  newGap: number;
} | null {
  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const permanentGKArray = Array.from(gkIdSet);

  let bestSwap: {
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    improvement: number;
    newGap: number;
  } | null = null;

  for (const bluePlayer of blueTeam) {
    if (gkIdSet.has(bluePlayer.player_id)) continue;

    for (const orangePlayer of orangeTeam) {
      if (gkIdSet.has(orangePlayer.player_id)) continue;

      // Simulate the swap
      const testBlue = blueTeam.map(p => p.player_id === bluePlayer.player_id ? orangePlayer : p);
      const testOrange = orangeTeam.map(p => p.player_id === orangePlayer.player_id ? bluePlayer : p);

      // Calculate new attribute gap
      const blueAttrsAfter = calculateTeamAttributes(testBlue);
      const orangeAttrsAfter = calculateTeamAttributes(testOrange);

      if (!blueAttrsAfter.hasAttributes || !orangeAttrsAfter.hasAttributes) continue;

      const newGap = Math.abs((blueAttrsAfter[attributeName] - orangeAttrsAfter[attributeName]) * 10);
      const improvement = currentGap - newGap;

      // Only consider swaps that reduce the gap AND don't worsen overall balance too much
      if (improvement > 0.1) {
        // Check player quality gap - reject if rating difference > 1.5
        const ratingDiff = Math.abs((bluePlayer.attack_rating ?? 5) - (orangePlayer.attack_rating ?? 5));
        if (ratingDiff > 1.5) {
          continue; // Skip quality-destructive swaps
        }

        const scoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKArray);
        const scoreAfter = calculateMultiObjectiveScore(testBlue, testOrange, permanentGKArray);

        const overallChange = scoreAfter.overall - scoreBefore.overall;
        const biasChange = scoreAfter.systematicBias - scoreBefore.systematicBias;

        // Stricter acceptance criteria:
        // 1. Overall change must be < 0.01 (was 0.05)
        // 2. Must not worsen systematic bias
        if (overallChange < 0.01 && biasChange <= 0) {
          if (!bestSwap || improvement > bestSwap.improvement) {
            bestSwap = {
              bluePlayer,
              orangePlayer,
              improvement,
              newGap,
            };
          }
        }
      }
    }
  }

  return bestSwap;
}

/**
 * Find swaps that specifically target a catastrophic attribute gap
 * Uses RELAXED criteria - for use in post-optimization validation only
 * - Allows player rating diff up to 2.5 (normal: 1.5)
 * - Allows overall score change up to 0.15 (normal: 0.01)
 * - Only requirement: must reduce the gap significantly (> 0.5)
 */
function findAttributeTargetedSwapRelaxed(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  attributeName: 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical',
  currentGap: number,
  permanentGKIds: Set<string> | string[]
): {
  bluePlayer: PlayerWithRating;
  orangePlayer: PlayerWithRating;
  improvement: number;
  newGap: number;
} | null {
  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const permanentGKArray = Array.from(gkIdSet);

  // Relaxed thresholds for catastrophic gap fixing
  const MAX_RATING_DIFF = 2.5;  // Was 1.5 in normal version
  const MAX_OVERALL_CHANGE = 0.15;  // Was 0.01 in normal version
  const MIN_GAP_REDUCTION = 0.5;  // Must reduce gap by at least 0.5

  let bestSwap: {
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    improvement: number;
    newGap: number;
  } | null = null;

  for (const bluePlayer of blueTeam) {
    if (gkIdSet.has(bluePlayer.player_id)) continue;

    for (const orangePlayer of orangeTeam) {
      if (gkIdSet.has(orangePlayer.player_id)) continue;

      // Simulate the swap
      const testBlue = blueTeam.map(p => p.player_id === bluePlayer.player_id ? orangePlayer : p);
      const testOrange = orangeTeam.map(p => p.player_id === orangePlayer.player_id ? bluePlayer : p);

      // Calculate new attribute gap
      const blueAttrsAfter = calculateTeamAttributes(testBlue);
      const orangeAttrsAfter = calculateTeamAttributes(testOrange);

      if (!blueAttrsAfter.hasAttributes || !orangeAttrsAfter.hasAttributes) continue;

      const newGap = Math.abs((blueAttrsAfter[attributeName] - orangeAttrsAfter[attributeName]) * 10);
      const improvement = currentGap - newGap;

      // RELAXED criteria: only need significant gap reduction
      if (improvement > MIN_GAP_REDUCTION) {
        // Check player quality gap with relaxed threshold
        const ratingDiff = Math.abs((bluePlayer.attack_rating ?? 5) - (orangePlayer.attack_rating ?? 5));
        if (ratingDiff > MAX_RATING_DIFF) {
          continue; // Still reject extreme quality mismatches
        }

        const scoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKArray);
        const scoreAfter = calculateMultiObjectiveScore(testBlue, testOrange, permanentGKArray);

        const overallChange = scoreAfter.overall - scoreBefore.overall;

        // Relaxed acceptance: allow larger overall changes for catastrophic fixes
        if (overallChange < MAX_OVERALL_CHANGE) {
          if (!bestSwap || improvement > bestSwap.improvement) {
            bestSwap = {
              bluePlayer,
              orangePlayer,
              improvement,
              newGap,
            };
          }
        }
      }
    }
  }

  return bestSwap;
}

/**
 * Check for problematic attribute gaps and attempt targeted swaps
 * Returns true if a swap was made
 */
function tryAttributeTargetedOptimization(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const EXTREME_GAP_THRESHOLD = 1.5; // Single extreme gap triggers optimization
  const MODERATE_GAP_THRESHOLD = 0.9; // Multiple moderate gaps trigger optimization

  // Calculate current attribute gaps
  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  if (!blueAttrs.hasAttributes || !orangeAttrs.hasAttributes) return false;

  const attributes: Array<'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'> = [
    'pace',
    'shooting',
    'passing',
    'dribbling',
    'defending',
    'physical',
  ];

  // Collect ALL extreme gaps (>1.5) and moderate gaps (>0.9)
  const extremeGaps: Array<{ attr: typeof attributes[number]; gap: number }> = [];
  const moderateGaps: Array<{ attr: string; gap: number }> = [];

  for (const attr of attributes) {
    const gap = Math.abs((blueAttrs[attr] - orangeAttrs[attr]) * 10);

    // Track extreme gaps separately for prioritized processing
    if (gap > EXTREME_GAP_THRESHOLD) {
      extremeGaps.push({ attr, gap });
    }

    // Track moderate gaps
    if (gap > MODERATE_GAP_THRESHOLD) {
      moderateGaps.push({ attr, gap });
    }
  }

  // Sort extreme gaps by size (largest first) for priority processing
  extremeGaps.sort((a, b) => b.gap - a.gap);

  // Determine if optimization should trigger:
  // 1. Any extreme gaps (> 1.5), OR
  // 2. Multiple moderate gaps (2+ gaps > 0.9)
  const hasExtremeGaps = extremeGaps.length > 0;
  const hasMultipleModerateGaps = moderateGaps.length >= 2;

  if (!hasExtremeGaps && !hasMultipleModerateGaps) {
    return false; // No problematic gaps found
  }

  // Target the largest extreme gap, or largest moderate gap if no extreme gaps
  let problematicAttribute: typeof attributes[number];
  let largestGap: number;

  if (hasExtremeGaps) {
    problematicAttribute = extremeGaps[0].attr;
    largestGap = extremeGaps[0].gap;
  } else {
    const sortedGaps = moderateGaps.sort((a, b) => b.gap - a.gap);
    problematicAttribute = sortedGaps[0].attr as typeof attributes[number];
    largestGap = sortedGaps[0].gap;
  }

  if (debugLog) {
    debugLog.value += `\n🎯 Attribute-Targeted Optimization:\n`;
    if (hasExtremeGaps) {
      debugLog.value += `  Trigger: ${extremeGaps.length} extreme gap(s) detected (> ${EXTREME_GAP_THRESHOLD})\n`;
      debugLog.value += `  All extreme gaps: ${extremeGaps.map(g => `${g.attr}(${g.gap.toFixed(2)})`).join(', ')}\n`;
    } else {
      debugLog.value += `  Trigger: Multiple moderate gaps detected (${moderateGaps.length} gaps > ${MODERATE_GAP_THRESHOLD})\n`;
      debugLog.value += `  Moderate gaps: ${moderateGaps.map(g => `${g.attr}(${g.gap.toFixed(2)})`).join(', ')}\n`;
    }
    debugLog.value += `  Targeting: ${problematicAttribute} (gap: ${largestGap.toFixed(2)})\n`;
    debugLog.value += `  Searching for targeted swaps...\n`;
  }

  const debugLogArray: string[] = [];
  const targetedSwap = findAttributeTargetedSwap(
    blueTeam,
    orangeTeam,
    problematicAttribute,
    largestGap,
    gkIdSet,
    debugLogArray
  );

  if (targetedSwap) {
    // Execute the swap
    const blueIdx = blueTeam.findIndex(p => p.player_id === targetedSwap.bluePlayer.player_id);
    const orangeIdx = orangeTeam.findIndex(p => p.player_id === targetedSwap.orangePlayer.player_id);

    if (blueIdx !== -1 && orangeIdx !== -1) {
      [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];

      if (debugLog) {
        debugLog.value += `  ✓ Targeted swap executed: ${targetedSwap.bluePlayer.friendly_name} ↔ ${targetedSwap.orangePlayer.friendly_name}\n`;
        debugLog.value += `  ${problematicAttribute} gap: ${largestGap.toFixed(2)} → ${targetedSwap.newGap.toFixed(2)}\n`;
        debugLog.value += `  Improvement: ${targetedSwap.improvement.toFixed(2)}\n\n`;
      }

      return true;
    }
  }

  if (debugLog) {
    debugLog.value += `  No beneficial targeted swaps found\n\n`;
  }

  return false;
}

/**
 * Post-optimization validation for catastrophic attribute gaps
 * Runs AFTER all optimization phases to catch gaps that SA may have created or worsened
 * Uses relaxed swap criteria because fixing catastrophic gaps is more important than minor balance changes
 * Phase 2: Added balance guard to prevent pipeline from destroying SA's good balance
 */
function validateAndFixCatastrophicGaps(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  const CATASTROPHIC_GAP_THRESHOLD = 1.5; // Any single attribute gap > 1.5 is catastrophic (lowered from 2.0)
  const MAX_BALANCE_DEGRADATION = 0.20; // Jan 2026: Increased from 0.12 to allow fixing catastrophic gaps with minimal impact

  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const gkIdArray = Array.from(gkIdSet);

  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  if (!blueAttrs.hasAttributes || !orangeAttrs.hasAttributes) return false;

  const attributes: Array<'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'> = [
    'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'
  ];
  const catastrophicGaps: Array<{ attr: typeof attributes[number]; gap: number }> = [];

  for (const attr of attributes) {
    const gap = Math.abs((blueAttrs[attr] - orangeAttrs[attr]) * 10);
    if (gap > CATASTROPHIC_GAP_THRESHOLD) {
      catastrophicGaps.push({ attr, gap });
    }
  }

  if (catastrophicGaps.length === 0) return false;

  // Sort by gap size (largest first) and try to fix each
  catastrophicGaps.sort((a, b) => b.gap - a.gap);

  if (debugLog) {
    debugLog.value += `\n🚨 POST-OPTIMIZATION VALIDATION: Found ${catastrophicGaps.length} catastrophic gap(s)\n`;
    catastrophicGaps.forEach(({ attr, gap }) => {
      debugLog.value += `   - ${attr}: ${gap.toFixed(2)} (threshold: ${CATASTROPHIC_GAP_THRESHOLD})\n`;
    });
  }

  let swapsMade = false;
  for (const { attr, gap } of catastrophicGaps) {
    // Use RELAXED criteria for catastrophic fixes
    const swap = findAttributeTargetedSwapRelaxed(
      blueTeam, orangeTeam, attr, gap, gkIdSet
    );

    if (swap) {
      // Execute swap
      const blueIdx = blueTeam.findIndex(p => p.player_id === swap.bluePlayer.player_id);
      const orangeIdx = orangeTeam.findIndex(p => p.player_id === swap.orangePlayer.player_id);

      if (blueIdx !== -1 && orangeIdx !== -1) {
        // Phase 2: Balance guard - capture balance before swap
        const balanceBefore = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);

        // Phase 3: Skill dominance guard - capture skill status before swap
        const skillStatusBefore = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

        // Execute swap
        [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];

        // Phase 2: Check balance after swap
        const balanceAfter = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);

        // Phase 3: Check skill dominance after swap
        const skillStatusAfter = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

        // Reject swap if balance degradation exceeds threshold
        if (balanceAfter - balanceBefore > MAX_BALANCE_DEGRADATION) {
          // Revert the swap
          [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
          if (debugLog) {
            debugLog.value += `   ⚠️ Rejected ${attr} swap: balance degradation too high (${balanceBefore.toFixed(3)} → ${balanceAfter.toFixed(3)}, max: ${MAX_BALANCE_DEGRADATION})\n`;
          }
          continue; // Try next gap
        }

        // Phase 3: Reject swap if it creates or worsens skill dominance
        // Only reject if: (a) creates new dominance, OR (b) makes existing dominance worse
        const createsNewDominance = !skillStatusBefore.isCoreSkillDominated && skillStatusAfter.isCoreSkillDominated;
        const worsensDominance = skillStatusBefore.isCoreSkillDominated && skillStatusAfter.isCoreSkillDominated &&
          Math.abs(skillStatusAfter.blueWins - skillStatusAfter.orangeWins) > Math.abs(skillStatusBefore.blueWins - skillStatusBefore.orangeWins);

        if (createsNewDominance || worsensDominance) {
          // Revert the swap
          [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
          if (debugLog) {
            debugLog.value += `   ⚠️ Rejected ${attr} swap: would ${createsNewDominance ? 'create' : 'worsen'} skill dominance (${skillStatusBefore.blueWins}-${skillStatusBefore.orangeWins} → ${skillStatusAfter.blueWins}-${skillStatusAfter.orangeWins})\n`;
          }
          continue; // Try next gap
        }

        swapsMade = true;

        if (debugLog) {
          debugLog.value += `   ✓ Fixed ${attr} gap: ${gap.toFixed(2)} → ${swap.newGap.toFixed(2)}\n`;
          debugLog.value += `     Swap: ${swap.bluePlayer.friendly_name} ↔ ${swap.orangePlayer.friendly_name}\n`;
          debugLog.value += `     Balance: ${balanceBefore.toFixed(3)} → ${balanceAfter.toFixed(3)}\n`;
        }
      }
    } else if (debugLog) {
      debugLog.value += `   ✗ Could not fix ${attr} gap (${gap.toFixed(2)}) - no valid swaps found\n`;
    }
  }

  return swapsMade;
}

/**
 * Count the number of extreme attribute gaps (>1.5) between teams
 * Used to track progress of gap resolution
 */
function countExtremeGaps(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[]
): number {
  const THRESHOLD = 1.5;
  const attributes: Array<'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'> = [
    'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'
  ];

  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  if (!blueAttrs.hasAttributes || !orangeAttrs.hasAttributes) return 0;

  return attributes.filter(attr => {
    const gap = Math.abs((blueAttrs[attr] - orangeAttrs[attr]) * 10);
    return gap > THRESHOLD;
  }).length;
}

/**
 * Attempt to balance striker distribution by swapping a striker for a non-striker
 * Finds the swap with minimal rating difference to preserve overall balance
 * Phase 2: Added balance guard but with higher tolerance since this is a hard position constraint
 * @param maxRatingDiff - Maximum allowed rating difference for swaps (default 1.5, can be relaxed)
 */
function attemptStrikerBalanceSwap(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  maxRatingDiff: number = 1.5,
  maxBalanceDegradation: number = 0.10, // Phase 3: Now a parameter for progressive relaxation
  debugLog?: { value: string }
): boolean {

  const blueStrikers = blueTeam.filter(p => p.primaryPosition === 'ST');
  const orangeStrikers = orangeTeam.filter(p => p.primaryPosition === 'ST');

  // Determine which team donates a striker (the one that has strikers)
  const donorTeam = blueStrikers.length > 0 ? blueTeam : orangeTeam;
  const receiverTeam = blueStrikers.length > 0 ? orangeTeam : blueTeam;
  const donorStrikers = blueStrikers.length > 0 ? blueStrikers : orangeStrikers;
  const donorTeamName = blueStrikers.length > 0 ? 'Blue' : 'Orange';
  const receiverTeamName = blueStrikers.length > 0 ? 'Orange' : 'Blue';

  // Phase 2: Find best swap with balance guard - consider balance degradation in swap selection
  let bestSwap: {
    striker: PlayerWithRating;
    replacement: PlayerWithRating;
    ratingDiff: number;
    balanceDegradation: number;
  } | null = null;

  // Calculate initial balance (use empty array for GK IDs since this is position-specific)
  const initialBalance = calculateTierBalanceScore(blueTeam, orangeTeam, []);

  for (const striker of donorStrikers) {
    for (const candidate of receiverTeam) {
      // Don't swap strikers for strikers
      if (candidate.primaryPosition === 'ST') continue;

      const ratingDiff = Math.abs(striker.threeLayerRating - candidate.threeLayerRating);
      // Skip if rating difference is too large (would create imbalanced teams)
      if (ratingDiff > maxRatingDiff) continue;

      // Phase 2: Calculate balance impact of this swap
      const strikerIdx = donorTeam.findIndex(p => p.player_id === striker.player_id);
      const replacementIdx = receiverTeam.findIndex(p => p.player_id === candidate.player_id);

      if (strikerIdx !== -1 && replacementIdx !== -1) {
        // Simulate swap
        [donorTeam[strikerIdx], receiverTeam[replacementIdx]] = [receiverTeam[replacementIdx], donorTeam[strikerIdx]];
        const newBalance = calculateTierBalanceScore(blueTeam, orangeTeam, []);
        // Revert swap
        [donorTeam[strikerIdx], receiverTeam[replacementIdx]] = [receiverTeam[replacementIdx], donorTeam[strikerIdx]];

        const balanceDegradation = newBalance - initialBalance;

        // Skip if balance degradation is too severe (Phase 3: now uses parameter)
        if (balanceDegradation > maxBalanceDegradation) continue;

        // Prefer swaps with lower rating diff and lower balance degradation
        if (!bestSwap ||
            (balanceDegradation < bestSwap.balanceDegradation - 0.01) ||
            (Math.abs(balanceDegradation - bestSwap.balanceDegradation) < 0.01 && ratingDiff < bestSwap.ratingDiff)) {
          bestSwap = { striker, replacement: candidate, ratingDiff, balanceDegradation };
        }
      }
    }
  }

  if (bestSwap) {
    // Execute the swap
    const strikerIdx = donorTeam.findIndex(p => p.player_id === bestSwap!.striker.player_id);
    const replacementIdx = receiverTeam.findIndex(p => p.player_id === bestSwap!.replacement.player_id);

    if (strikerIdx !== -1 && replacementIdx !== -1) {
      [donorTeam[strikerIdx], receiverTeam[replacementIdx]] = [receiverTeam[replacementIdx], donorTeam[strikerIdx]];

      if (debugLog) {
        debugLog.value += `   ✓ Fixed: ${bestSwap.striker.friendly_name} (ST, ${donorTeamName}) ↔ ${bestSwap.replacement.friendly_name} (${bestSwap.replacement.primaryPosition}, ${receiverTeamName})\n`;
        debugLog.value += `     Rating difference: ${bestSwap.ratingDiff.toFixed(2)} (max allowed: ${maxRatingDiff})\n`;
        debugLog.value += `     Balance impact: ${initialBalance.toFixed(3)} → ${(initialBalance + bestSwap.balanceDegradation).toFixed(3)}\n`;
      }

      return true;
    }
  }

  if (debugLog) {
    debugLog.value += `   ✗ Could not find valid swap to fix striker imbalance\n`;
    debugLog.value += `     All potential swaps would create >${maxRatingDiff} rating diff or >${maxBalanceDegradation.toFixed(2)} balance degradation\n`;
  }

  return false;
}

/**
 * Validate and attempt to fix critical position imbalances (especially strikers)
 * This is a strong soft constraint - heavily penalized but allows edge cases
 * Returns whether teams are valid and whether a fix was applied
 * Uses ITERATIVE approach with progressively relaxed rating constraints
 */
function validateAndFixCriticalPositions(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  debugLog?: { value: string }
): { valid: boolean; fixed: boolean } {
  // Check for critical striker imbalance (0 vs 2+)
  const blueStrikers = blueTeam.filter(p => p.primaryPosition === 'ST').length;
  const orangeStrikers = orangeTeam.filter(p => p.primaryPosition === 'ST').length;
  const totalStrikers = blueStrikers + orangeStrikers;

  // Only trigger if there are 2+ strikers total and one team has none
  if (totalStrikers >= 2 && (blueStrikers === 0 || orangeStrikers === 0)) {
    if (debugLog) {
      debugLog.value += `\n⚠️ CRITICAL: Striker imbalance detected (Blue: ${blueStrikers}, Orange: ${orangeStrikers})\n`;
      debugLog.value += `   Total strikers: ${totalStrikers}, but one team has none\n`;
      debugLog.value += `   Attempting forced swap to balance strikers with iterative relaxation...\n`;
    }

    // Phase 3: Progressive relaxation for BOTH rating diff AND balance degradation
    // Striker balance is a hard constraint that should override balance preservation
    const relaxationLevels = [
      { rating: 1.5, balance: 0.10 },
      { rating: 2.0, balance: 0.15 },
      { rating: 2.5, balance: 0.20 },
      { rating: 3.0, balance: 0.25 },
      { rating: 4.0, balance: 0.35 },  // Most relaxed - striker balance is critical
    ];

    for (const level of relaxationLevels) {
      const fixed = attemptStrikerBalanceSwap(blueTeam, orangeTeam, level.rating, level.balance, debugLog);
      if (fixed) {
        if (debugLog && (level.rating > 1.5 || level.balance > 0.10)) {
          debugLog.value += `     (Used relaxed thresholds: rating=${level.rating}, balance=${level.balance})\n`;
        }
        return { valid: true, fixed: true };
      }
    }

    // All relaxation levels failed
    if (debugLog) {
      debugLog.value += `   ✗ All relaxation levels exhausted - striker imbalance could not be fixed\n`;
    }
    return { valid: false, fixed: false };
  }

  // No critical imbalance detected
  return { valid: true, fixed: false };
}

/**
 * Calculate which team wins each of the 4 core skill metrics (attack, defense, game_iq, gk)
 * Returns counts and whether there's skill dominance (one team wins all 4)
 */
function calculateSkillDominance(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[]
): { blueWins: number; orangeWins: number; isSkillDominated: boolean } {
  const blueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
  const orangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;

  const blueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
  const orangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;

  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  const blueGk = blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;
  const orangeGk = orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  let blueWins = 0;
  let orangeWins = 0;
  const SKILL_TIE_THRESHOLD = 0.1; // Skills within 0.1 are considered tied

  if (blueAttack - orangeAttack > SKILL_TIE_THRESHOLD) blueWins++;
  else if (orangeAttack - blueAttack > SKILL_TIE_THRESHOLD) orangeWins++;

  if (blueDefense - orangeDefense > SKILL_TIE_THRESHOLD) blueWins++;
  else if (orangeDefense - blueDefense > SKILL_TIE_THRESHOLD) orangeWins++;

  if (blueGameIq - orangeGameIq > SKILL_TIE_THRESHOLD) blueWins++;
  else if (orangeGameIq - blueGameIq > SKILL_TIE_THRESHOLD) orangeWins++;

  if (blueGk - orangeGk > SKILL_TIE_THRESHOLD) blueWins++;
  else if (orangeGk - blueGk > SKILL_TIE_THRESHOLD) orangeWins++;

  // Skill dominated = one team wins 3+ skills with opponent winning 0-1 (e.g., 4-0, 4-1, 3-0, 3-1)
  // Expanded from just 4-0/3-0 to also catch 4-1 and 3-1 patterns which are still problematic
  const isSkillDominated =
    (blueWins >= 3 && orangeWins <= 1) ||
    (orangeWins >= 3 && blueWins <= 1);

  return { blueWins, orangeWins, isSkillDominated };
}

/**
 * Calculate which team wins each of the 3 CORE skill metrics (attack, defense, game_iq)
 * EXCLUDES GK because of rotating keeper system (~7 min per player)
 * Returns counts and whether there's core skill dominance (one team wins 3-0)
 *
 * For Attack/Defense: excludes permanent GKs (they're in goal, not playing outfield)
 * For Game IQ: includes all players (positioning/awareness matters for everyone)
 */
function calculateCoreSkillDominance(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds?: Set<string> | string[]
): {
  blueWins: number;
  orangeWins: number;
  isCoreSkillDominated: boolean;
  details: { skill: string; blueAvg: number; orangeAvg: number; winner: 'blue' | 'orange' | 'tie' }[];
  pairing: ComplementaryPairingResult;
  existingDominance: boolean;
  pairingViolated: boolean;
} {
  // Convert to Set for consistent checking
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds || []);

  // For Attack/Defense: exclude permanent GKs (they're in goal)
  const blueOutfield = blueTeam.filter(p => !gkIdSet.has(p.player_id));
  const orangeOutfield = orangeTeam.filter(p => !gkIdSet.has(p.player_id));

  // Use outfield players for attack/defense, or full team if no outfield
  const bluePlayersForOutfield = blueOutfield.length > 0 ? blueOutfield : blueTeam;
  const orangePlayersForOutfield = orangeOutfield.length > 0 ? orangeOutfield : orangeTeam;

  const blueAttack = bluePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeAttack = orangePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangePlayersForOutfield.length;

  const blueDefense = bluePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeDefense = orangePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangePlayersForOutfield.length;

  // Game IQ: include all players (positioning/awareness matters for everyone including GK)
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  let blueWins = 0;
  let orangeWins = 0;
  const SKILL_TIE_THRESHOLD = 0.1; // Skills within 0.1 are considered tied
  const details: { skill: string; blueAvg: number; orangeAvg: number; winner: 'blue' | 'orange' | 'tie' }[] = [];

  // Attack
  if (blueAttack - orangeAttack > SKILL_TIE_THRESHOLD) {
    blueWins++;
    details.push({ skill: 'attack', blueAvg: blueAttack, orangeAvg: orangeAttack, winner: 'blue' });
  } else if (orangeAttack - blueAttack > SKILL_TIE_THRESHOLD) {
    orangeWins++;
    details.push({ skill: 'attack', blueAvg: blueAttack, orangeAvg: orangeAttack, winner: 'orange' });
  } else {
    details.push({ skill: 'attack', blueAvg: blueAttack, orangeAvg: orangeAttack, winner: 'tie' });
  }

  // Defense
  if (blueDefense - orangeDefense > SKILL_TIE_THRESHOLD) {
    blueWins++;
    details.push({ skill: 'defense', blueAvg: blueDefense, orangeAvg: orangeDefense, winner: 'blue' });
  } else if (orangeDefense - blueDefense > SKILL_TIE_THRESHOLD) {
    orangeWins++;
    details.push({ skill: 'defense', blueAvg: blueDefense, orangeAvg: orangeDefense, winner: 'orange' });
  } else {
    details.push({ skill: 'defense', blueAvg: blueDefense, orangeAvg: orangeDefense, winner: 'tie' });
  }

  // Game IQ
  if (blueGameIq - orangeGameIq > SKILL_TIE_THRESHOLD) {
    blueWins++;
    details.push({ skill: 'gameIq', blueAvg: blueGameIq, orangeAvg: orangeGameIq, winner: 'blue' });
  } else if (orangeGameIq - blueGameIq > SKILL_TIE_THRESHOLD) {
    orangeWins++;
    details.push({ skill: 'gameIq', blueAvg: blueGameIq, orangeAvg: orangeGameIq, winner: 'orange' });
  } else {
    details.push({ skill: 'gameIq', blueAvg: blueGameIq, orangeAvg: orangeGameIq, winner: 'tie' });
  }

  // EXISTING CHECK: One team wins 0 of 3 core skills (GK excluded)
  // Each team must win at least 1 core skill - minimum 1-2 or 2-1 split
  // Catches: 3-0, 2-0 (with tie), 1-0 (with 2 ties)
  const existingDominance = blueWins === 0 || orangeWins === 0;

  // NEW CHECK: Complementary ATK↔DEF pairing
  // Ensures Attack and Defense advantages are on opposite teams
  // This creates tactical balance: "you can score but I can stop you"
  const pairing = checkComplementarySkillPairing(blueTeam, orangeTeam, gkIdSet);
  const pairingViolated = pairing.pairingStatus === 'violated';

  // COMBINED: Both checks must pass for teams to be balanced
  const isCoreSkillDominated = existingDominance || pairingViolated;

  return { blueWins, orangeWins, isCoreSkillDominated, details, pairing, existingDominance, pairingViolated };
}

/**
 * EMERGENCY Core Skill Fix: When one team wins 0 core skills
 * This is a last-resort fix that accepts swaps with relaxed constraints
 * to ensure each team wins at least 1 of Attack/Defense/Game IQ
 *
 * Triggers for: 3-0, 2-0 (with tie), 1-0 (with 2 ties)
 * Only considers outfield players (excludes permanent GKs from calculations)
 */
function emergencyCoreSkillFix(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);

  const coreStatus = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

  // Only trigger when one team wins 0 core skills
  if (!coreStatus.isCoreSkillDominated) {
    return false;
  }

  const dominantTeam = coreStatus.blueWins > coreStatus.orangeWins ? 'blue' : 'orange';

  if (debugLog) {
    debugLog.value += `\n🚨 EMERGENCY CORE SKILL FIX: ${dominantTeam.toUpperCase()} wins ${coreStatus.blueWins > coreStatus.orangeWins ? coreStatus.blueWins : coreStatus.orangeWins}/3 core skills\n`;
    debugLog.value += `   Core skills: Attack, Defense, Game IQ (GK excluded from core balance)\n`;
    debugLog.value += `   Details:\n`;
    for (const d of coreStatus.details) {
      debugLog.value += `     ${d.skill}: Blue ${d.blueAvg.toFixed(2)} vs Orange ${d.orangeAvg.toFixed(2)} → ${d.winner === 'tie' ? 'TIE' : d.winner.toUpperCase()}\n`;
    }
    debugLog.value += `   Searching for emergency swap...\n`;
  }

  const dominantTeamPlayers = dominantTeam === 'blue' ? blueTeam : orangeTeam;
  const weakerTeamPlayers = dominantTeam === 'blue' ? orangeTeam : blueTeam;

  // Calculate average core skill for each player (Attack + Defense + Game IQ)
  const getCoreSkillAvg = (p: PlayerWithRating) =>
    ((p.attack_rating ?? 5) + (p.defense_rating ?? 5) + (p.game_iq_rating ?? 5)) / 3;

  // Get non-GK players sorted by core skill contribution
  const dominantNonGK = dominantTeamPlayers
    .filter(p => !gkIdSet.has(p.player_id))
    .sort((a, b) => getCoreSkillAvg(b) - getCoreSkillAvg(a)); // High to low

  const weakerNonGK = weakerTeamPlayers
    .filter(p => !gkIdSet.has(p.player_id))
    .sort((a, b) => getCoreSkillAvg(a) - getCoreSkillAvg(b)); // Low to high

  // Try swaps with progressively relaxed constraints
  const ratingThresholds = [1.0, 1.5, 2.0, 2.5, 3.0];

  // Balance degradation guard: max 20% degradation allowed for emergency fixes
  const MAX_BALANCE_DEGRADATION = 0.20;
  const balanceBefore = calculateBalanceScore(blueTeam, orangeTeam);

  for (const maxRatingDiff of ratingThresholds) {
    for (const playerFromDominant of dominantNonGK) {
      for (const playerFromWeaker of weakerNonGK) {
        // Check rating tolerance
        const ratingDiff = Math.abs(playerFromDominant.threeLayerRating - playerFromWeaker.threeLayerRating);
        if (ratingDiff > maxRatingDiff) continue;

        // Simulate the swap
        const domIdx = dominantTeamPlayers.findIndex(p => p.player_id === playerFromDominant.player_id);
        const weakIdx = weakerTeamPlayers.findIndex(p => p.player_id === playerFromWeaker.player_id);

        if (domIdx === -1 || weakIdx === -1) continue;

        // Execute swap temporarily
        [dominantTeamPlayers[domIdx], weakerTeamPlayers[weakIdx]] = [weakerTeamPlayers[weakIdx], dominantTeamPlayers[domIdx]];

        // Check if core skill balance improved
        const afterStatus = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

        // Calculate balance after swap
        const balanceAfter = calculateBalanceScore(blueTeam, orangeTeam);
        const degradation = (balanceAfter - balanceBefore) / balanceBefore;

        // Accept if we broke the dominance AND balance degradation is acceptable
        if (!afterStatus.isCoreSkillDominated) {
          if (degradation <= MAX_BALANCE_DEGRADATION) {
            if (debugLog) {
              debugLog.value += `   ✓ EMERGENCY FIX SUCCESS: ${playerFromDominant.friendly_name} ↔ ${playerFromWeaker.friendly_name}\n`;
              debugLog.value += `     Core skill balance: ${coreStatus.blueWins}-${coreStatus.orangeWins} → ${afterStatus.blueWins}-${afterStatus.orangeWins}\n`;
              debugLog.value += `     Rating diff: ${ratingDiff.toFixed(2)} (threshold: ${maxRatingDiff})\n`;
              debugLog.value += `     Balance impact: ${balanceBefore.toFixed(3)} → ${balanceAfter.toFixed(3)} (${degradation > 0 ? '+' : ''}${(degradation * 100).toFixed(1)}%)\n`;
            }
            return true;
          } else {
            // Swap would fix core skills but degrade balance too much
            if (debugLog) {
              debugLog.value += `   ⚠️ Rejected ${playerFromDominant.friendly_name} ↔ ${playerFromWeaker.friendly_name}: `;
              debugLog.value += `balance degradation too high (${balanceBefore.toFixed(3)} → ${balanceAfter.toFixed(3)}, ${(degradation * 100).toFixed(1)}% > ${MAX_BALANCE_DEGRADATION * 100}% max)\n`;
            }
          }
        }

        // Swap didn't help enough or degraded balance too much, revert
        [dominantTeamPlayers[domIdx], weakerTeamPlayers[weakIdx]] = [weakerTeamPlayers[weakIdx], dominantTeamPlayers[domIdx]];
      }
    }
  }

  if (debugLog) {
    debugLog.value += `   ✗ EMERGENCY FIX FAILED: Could not ensure each team wins at least 1 core skill\n`;
  }

  return false;
}

/**
 * Validation grade for tiered quality assessment
 * Used in debug logs to provide nuanced feedback on team balance quality
 */
type ValidationGrade = 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'FAIL';

/**
 * Get validation grade for core skill distribution
 * @param blueWins - Number of core skills (ATK/DEF/IQ) Blue team wins
 * @param orangeWins - Number of core skills Orange team wins
 */
function getCoreSkillGrade(blueWins: number, orangeWins: number): ValidationGrade {
  const minWins = Math.min(blueWins, orangeWins);
  const maxWins = Math.max(blueWins, orangeWins);

  // Each team must win at least 1 skill
  if (minWins === 0) {
    return maxWins === 3 ? 'FAIL' : 'POOR';  // 3-0 is FAIL, 2-0 or 1-0 is POOR
  }

  // 2-1 split is ideal
  if (maxWins === 2 && minWins === 1) return 'EXCELLENT';

  // 1-1 with tie is good
  if (maxWins === 1 && minWins === 1) return 'GOOD';

  return 'ACCEPTABLE';
}

/**
 * Get validation grade for average rating difference
 * @param difference - Absolute difference in average three-layer ratings
 */
function getAvgRatingGrade(difference: number): ValidationGrade {
  if (difference <= 0.15) return 'EXCELLENT';
  if (difference <= 0.25) return 'GOOD';
  if (difference <= 0.35) return 'ACCEPTABLE';
  if (difference <= 0.50) return 'POOR';
  return 'FAIL';
}

/**
 * Calculate overall validation grade from component grades
 */
function calculateOverallGrade(
  coreGrade: ValidationGrade,
  avgRatingGrade: ValidationGrade,
  attributeGrade: ValidationGrade,
  positionValid: boolean
): { grade: ValidationGrade; score: number } {
  if (!positionValid) return { grade: 'FAIL', score: 0 };

  const gradePoints: Record<ValidationGrade, number> = {
    'EXCELLENT': 100, 'GOOD': 80, 'ACCEPTABLE': 60, 'POOR': 40, 'FAIL': 0
  };

  // Weights: core skills 40%, avg rating 30%, attributes 30%
  const score =
    gradePoints[coreGrade] * 0.40 +
    gradePoints[avgRatingGrade] * 0.30 +
    gradePoints[attributeGrade] * 0.30;

  // Cap grade if any component is ACCEPTABLE or worse (prevents EXCELLENT with flawed balance)
  const hasAcceptableComponent =
    attributeGrade === 'ACCEPTABLE' ||
    coreGrade === 'ACCEPTABLE' ||
    avgRatingGrade === 'ACCEPTABLE';

  const hasPoorComponent =
    attributeGrade === 'POOR' ||
    coreGrade === 'POOR' ||
    avgRatingGrade === 'POOR';

  // Severe gameplay imbalances should prevent EXCELLENT grades
  if (hasAcceptableComponent && score >= 70) {
    return { grade: 'GOOD', score: Math.min(score, 79) };
  }

  // Critical gameplay imbalances should cap at ACCEPTABLE
  if (hasPoorComponent && score >= 50) {
    return { grade: 'ACCEPTABLE', score: Math.min(score, 69) };
  }

  if (score >= 85) return { grade: 'EXCELLENT', score };
  if (score >= 70) return { grade: 'GOOD', score };
  if (score >= 50) return { grade: 'ACCEPTABLE', score };
  if (score >= 30) return { grade: 'POOR', score };
  return { grade: 'FAIL', score };
}

/**
 * Final validation check for team balance
 * Returns a summary of all critical issues that could not be fixed
 */
interface ValidationResult {
  valid: boolean;
  issues: string[];
  grade: ValidationGrade;
  score: number;
  positionBalance: { valid: boolean; blueStrikers: number; orangeStrikers: number };
  coreSkillBalance: { valid: boolean; blueWins: number; orangeWins: number; grade: ValidationGrade };
  attributeGaps: { valid: boolean; extremeGaps: { attr: string; gap: number }[]; grade: ValidationGrade };
  avgRating: { blueAvg: number; orangeAvg: number; difference: number; grade: ValidationGrade };
  gkBalance: { blueGk: number; orangeGk: number };
}

function finalValidation(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[]
): ValidationResult {
  const issues: string[] = [];
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);

  // 1. Check position balance (strikers)
  const blueStrikers = blueTeam.filter(p => p.primaryPosition === 'ST').length;
  const orangeStrikers = orangeTeam.filter(p => p.primaryPosition === 'ST').length;
  const totalStrikers = blueStrikers + orangeStrikers;
  const positionValid = !(totalStrikers >= 2 && (blueStrikers === 0 || orangeStrikers === 0));

  if (!positionValid) {
    issues.push(`Position: Striker imbalance (Blue ${blueStrikers}, Orange ${orangeStrikers})`);
  }

  // 2. Check core skill balance (Attack, Defense, Game IQ - NOT GK)
  // Each team must win at least 1 core skill
  const coreStatus = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);
  const coreSkillValid = !coreStatus.isCoreSkillDominated;
  const coreSkillGrade = getCoreSkillGrade(coreStatus.blueWins, coreStatus.orangeWins);

  if (!coreSkillValid) {
    issues.push(`Core Skills: ${coreStatus.blueWins}-${coreStatus.orangeWins} - one team wins 0 core skills (need at least 1-2 split)`);
  }

  // 3. Check extreme attribute gaps (>2.5 is critical)
  const EXTREME_GAP_THRESHOLD = 2.5;
  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  const extremeGaps: { attr: string; gap: number }[] = [];
  if (blueAttrs.hasAttributes && orangeAttrs.hasAttributes) {
    const attributes: Array<'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'> = [
      'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'
    ];

    for (const attr of attributes) {
      const gap = Math.abs((blueAttrs[attr] - orangeAttrs[attr]) * 10);
      if (gap > EXTREME_GAP_THRESHOLD) {
        extremeGaps.push({ attr, gap });
      }
    }
  }

  const attributeValid = extremeGaps.length === 0;
  // Grade attributes based on largest gap (or EXCELLENT if no extreme gaps)
  const maxGap = extremeGaps.length > 0 ? Math.max(...extremeGaps.map(g => g.gap)) : 0;
  let attributeGrade: ValidationGrade = 'EXCELLENT';
  if (maxGap > 3.5) attributeGrade = 'FAIL';       // Catastrophic gap (35% imbalance)
  else if (maxGap > 2.5) attributeGrade = 'POOR';  // Severe gap (25% imbalance, e.g., 7 vs 2 shooters)
  else if (maxGap > 2.0) attributeGrade = 'ACCEPTABLE';  // Noticeable gap (20% imbalance)
  else if (maxGap > 1.5) attributeGrade = 'GOOD';  // Minor gap (15% imbalance)

  if (!attributeValid) {
    issues.push(`Attributes: ${extremeGaps.map(g => `${g.attr}(${g.gap.toFixed(1)})`).join(', ')} exceed threshold`);
  }

  // 4. Check average rating balance (NEW)
  const blueAvgRating = blueTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueTeam.length;
  const orangeAvgRating = orangeTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeTeam.length;
  const avgRatingDiff = Math.abs(blueAvgRating - orangeAvgRating);
  const avgRatingGrade = getAvgRatingGrade(avgRatingDiff);

  // Warn if average rating gap exceeds 0.25 (but don't fail validation for this alone)
  if (avgRatingDiff > 0.25) {
    issues.push(`Average Rating: ${avgRatingDiff.toFixed(2)} gap exceeds 0.25 threshold`);
  }

  // 5. GK balance (informational - less critical due to rotating keeper)
  const blueGk = blueTeam
    .filter(p => !gkIdSet.has(p.player_id)) // Exclude permanent GKs
    .reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / Math.max(1, blueTeam.filter(p => !gkIdSet.has(p.player_id)).length);
  const orangeGk = orangeTeam
    .filter(p => !gkIdSet.has(p.player_id))
    .reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / Math.max(1, orangeTeam.filter(p => !gkIdSet.has(p.player_id)).length);

  // Calculate overall grade
  let overallGrade = calculateOverallGrade(coreSkillGrade, avgRatingGrade, attributeGrade, positionValid);

  // NEW: Apply systematic bias grade cap based on attribute dominance
  // Count how many attributes each team wins (6 total attributes)
  let attributeWins = 0;
  if (blueAttrs.hasAttributes && orangeAttrs.hasAttributes) {
    if (blueAttrs.pace > orangeAttrs.pace) attributeWins++;
    if (blueAttrs.shooting > orangeAttrs.shooting) attributeWins++;
    if (blueAttrs.passing > orangeAttrs.passing) attributeWins++;
    if (blueAttrs.dribbling > orangeAttrs.dribbling) attributeWins++;
    if (blueAttrs.defending > orangeAttrs.defending) attributeWins++;
    if (blueAttrs.physical > orangeAttrs.physical) attributeWins++;
  }
  const orangeAttributeWins = 6 - attributeWins;

  // Cap grade based on attribute dominance (one team winning most/all attributes)
  const maxAttributeWins = Math.max(attributeWins, orangeAttributeWins);
  if (maxAttributeWins === 6) {
    // 6-0 sweep: cap at C+ (60/100)
    if (overallGrade.score > 60) {
      overallGrade = { grade: 'ACCEPTABLE', score: 60 };
      issues.push(`Systematic Bias: ${maxAttributeWins}-${6-maxAttributeWins} attribute sweep (grade capped at ACCEPTABLE)`);
    }
  } else if (maxAttributeWins === 5) {
    // 5-1 split: cap at B (75/100)
    if (overallGrade.score > 75) {
      overallGrade = { grade: 'GOOD', score: 75 };
      issues.push(`Systematic Bias: ${maxAttributeWins}-${6-maxAttributeWins} attribute split (grade capped at GOOD)`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    grade: overallGrade.grade,
    score: overallGrade.score,
    positionBalance: { valid: positionValid, blueStrikers, orangeStrikers },
    coreSkillBalance: { valid: coreSkillValid, blueWins: coreStatus.blueWins, orangeWins: coreStatus.orangeWins, grade: coreSkillGrade },
    attributeGaps: { valid: attributeValid, extremeGaps, grade: attributeGrade },
    avgRating: { blueAvg: blueAvgRating, orangeAvg: orangeAvgRating, difference: avgRatingDiff, grade: avgRatingGrade },
    gkBalance: { blueGk, orangeGk }
  };
}

/**
 * Post-optimization pipeline result interface
 */
interface PostOptimizationResult {
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
  balance: number;
  swapCount: number;
  positionFixed: boolean;
  coreSkillFixed: boolean;
  attributeFixed: boolean;
  validation: ValidationResult;
}

/**
 * Run the full post-optimization pipeline
 * This replaces the old scattered post-optimization fixes with a unified, ordered approach
 *
 * Phase 2 Update: Reduced from 8 steps to 6 steps
 * - Removed Step 5 (Elite Shooters): Shooting is one of 6 derived attributes, already handled by attribute balance
 * - Removed Step 6 (Tier Concentration): Superseded by Step 5 (Top 4/Bottom 4 Rank Split)
 * - Added balance guards to all remaining steps to preserve SA's balance during pipeline fixes
 *
 * Pipeline order (priority-based):
 * 1. Position Balance Fix (strikers) - HIGHEST PRIORITY, hard constraint
 * 2. Core Skill Balance Fix (Attack/Defense/Game IQ, GK excluded) - HIGH PRIORITY, hard constraint
 * 3. Catastrophic Attribute Gap Fix (>1.5 gaps) - soft fix with balance guard
 * 4. Systematic Bias Fix (6 derived attributes) - soft fix with balance guard
 * 5. Top 4 / Bottom 4 Rank Split Enforcement - user's hard requirement with balance guard
 * 6. Final Validation
 */
function runPostOptimizationPipeline(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string>,
  debugLog?: { value: string }
): PostOptimizationResult {
  let swapCount = 0;
  let positionFixed = false;
  let coreSkillFixed = false;
  let attributeFixed = false;

  if (debugLog) {
    debugLog.value += '\n';
    debugLog.value += '═══════════════════════════════════════════════════════════════\n';
    debugLog.value += '              POST-OPTIMIZATION PIPELINE                        \n';
    debugLog.value += '═══════════════════════════════════════════════════════════════\n';
  }

  // ============================================================================
  // STEP 1: POSITION BALANCE FIX (Striker distribution)
  // ============================================================================
  if (debugLog) {
    debugLog.value += '\n📍 STEP 1: Position Balance (Strikers)\n';
  }

  const positionResult = validateAndFixCriticalPositions(blueTeam, orangeTeam, debugLog);
  if (positionResult.fixed) {
    swapCount++;
    positionFixed = true;
  }

  // ============================================================================
  // STEP 2: CORE SKILL BALANCE FIX (Attack/Defense/Game IQ - GK excluded)
  // ============================================================================
  if (debugLog) {
    debugLog.value += '\n⚔️ STEP 2: Core Skill Balance (Attack/Defense/Game IQ)\n';
  }

  // First check current core skill status
  const coreStatusBefore = calculateCoreSkillDominance(blueTeam, orangeTeam, permanentGKIds);
  if (debugLog) {
    debugLog.value += `   Current: Blue ${coreStatusBefore.blueWins}/3, Orange ${coreStatusBefore.orangeWins}/3`;
    if (coreStatusBefore.isCoreSkillDominated) {
      debugLog.value += ` ⚠️ DOMINATED`;
      if (coreStatusBefore.pairingViolated) {
        debugLog.value += ` (ATK↔DEF pairing violated)`;
      }
      if (coreStatusBefore.existingDominance) {
        debugLog.value += ` (one team wins 0/3)`;
      }
      debugLog.value += `\n`;
    } else {
      debugLog.value += ` ✓ OK\n`;
    }
    // Show pairing details
    const p = coreStatusBefore.pairing;
    debugLog.value += `   ATK↔DEF Pairing: ${p.attackWinner === 'tie' ? 'Tied' : (p.attackWinner === 'blue' ? 'Blue' : 'Orange') + ' ATK'}, `;
    debugLog.value += `${p.defenseWinner === 'tie' ? 'Tied' : (p.defenseWinner === 'blue' ? 'Blue' : 'Orange') + ' DEF'} → `;
    debugLog.value += `${p.pairingStatus === 'perfect' ? '✓ Perfect' : p.pairingStatus === 'acceptable' ? '✓ OK' : '✗ Violated'}\n`;
    if (p.gameIqGap > PAIRING_CONFIG.GAME_IQ_SOFT_THRESHOLD) {
      debugLog.value += `   ℹ️ Game IQ gap ${p.gameIqGap.toFixed(2)} exceeds soft threshold ${PAIRING_CONFIG.GAME_IQ_SOFT_THRESHOLD}\n`;
    }
  }

  // Try standard skill bias fix first
  if (coreStatusBefore.isCoreSkillDominated) {
    const skillBiasFixed = checkAndFixSkillBias(blueTeam, orangeTeam, permanentGKIds, debugLog);
    if (skillBiasFixed) {
      swapCount++;
      coreSkillFixed = true;
    } else {
      // Try emergency fix if standard fix failed
      const emergencyFixed = emergencyCoreSkillFix(blueTeam, orangeTeam, permanentGKIds, debugLog);
      if (emergencyFixed) {
        swapCount++;
        coreSkillFixed = true;
      }
    }
  }

  // ============================================================================
  // STEP 3: CATASTROPHIC ATTRIBUTE GAP FIX (>2.0 gaps)
  // ============================================================================
  if (debugLog) {
    debugLog.value += '\n📊 STEP 3: Catastrophic Attribute Gaps\n';
  }

  const MAX_ATTR_FIX_ITERATIONS = 3;
  let attrFixIterations = 0;
  let totalGapsFixed = 0;

  while (attrFixIterations < MAX_ATTR_FIX_ITERATIONS) {
    const gapsBefore = countExtremeGaps(blueTeam, orangeTeam);

    if (gapsBefore === 0) {
      if (debugLog) {
        debugLog.value += `   ✓ No extreme gaps (>2.0) detected\n`;
      }
      break;
    }

    const gapFixed = validateAndFixCatastrophicGaps(blueTeam, orangeTeam, permanentGKIds, debugLog);
    if (gapFixed) {
      totalGapsFixed++;
      swapCount++;
      attributeFixed = true;
      attrFixIterations = 0; // Reset on success
    } else {
      attrFixIterations++;
    }
  }

  if (totalGapsFixed > 0 && debugLog) {
    debugLog.value += `   Fixed ${totalGapsFixed} extreme gap(s)\n`;
  }

  // ============================================================================
  // STEP 4: SYSTEMATIC BIAS FIX (6 derived attributes)
  // ============================================================================
  if (debugLog) {
    debugLog.value += '\n⚖️ STEP 4: Systematic Attribute Bias\n';
  }

  const MAX_BIAS_ITERATIONS = 2;
  let biasIterations = 0;

  while (biasIterations < MAX_BIAS_ITERATIONS) {
    const biasFixed = checkAndFixSystematicBias(blueTeam, orangeTeam, permanentGKIds, debugLog);
    if (!biasFixed) break;
    swapCount++;
    biasIterations++;
  }

  // ============================================================================
  // STEP 5 (WAS STEP 7): TOP 4 / BOTTOM 4 RANK SPLIT ENFORCEMENT
  // Phase 2: Removed Steps 5 (Elite Shooters) and 6 (Tier Concentration) - redundant with balance guards
  // ============================================================================
  // This enforces that the top 4 and bottom 4 players BY RANK are split 2-2 across teams.
  // This is the user's primary hard constraint - more important than tier-based balancing.
  if (debugLog) {
    debugLog.value += '\n🎖️ STEP 5: Top 4 / Bottom 4 Rank Split Enforcement\n';
  }

  // Get all players sorted by rank to determine top 4 / bottom 4
  const allPlayersSorted = [...blueTeam, ...orangeTeam].sort(
    (a, b) => b.threeLayerRating - a.threeLayerRating
  );

  const extremeSplitResult = validateAndFixExtremeSplits(
    blueTeam,
    orangeTeam,
    allPlayersSorted,
    permanentGKIds,
    debugLog
  );

  if (extremeSplitResult.fixesMade > 0) {
    swapCount += extremeSplitResult.fixesMade;
  }

  // ============================================================================
  // STEP 6: FINAL VALIDATION (Phase 2: was Step 8)
  // ============================================================================
  const validation = finalValidation(blueTeam, orangeTeam, permanentGKIds);
  const balance = calculateTierBalanceScore(blueTeam, orangeTeam, Array.from(permanentGKIds));

  if (debugLog) {
    // Helper function for grade emoji
    const gradeEmoji = (g: ValidationGrade) => {
      switch(g) {
        case 'EXCELLENT': return '🟢';
        case 'GOOD': return '🟢';
        case 'ACCEPTABLE': return '🟡';
        case 'POOR': return '🟠';
        case 'FAIL': return '🔴';
      }
    };

    debugLog.value += '\n';
    debugLog.value += '═══════════════════════════════════════════════════════════════\n';
    debugLog.value += '                    VALIDATION SUMMARY                          \n';
    debugLog.value += '═══════════════════════════════════════════════════════════════\n';

    // Core Skills with grade
    debugLog.value += `Core Skills (ATK/DEF/IQ):  Blue ${validation.coreSkillBalance.blueWins}/3, Orange ${validation.coreSkillBalance.orangeWins}/3  `;
    debugLog.value += `[${gradeEmoji(validation.coreSkillBalance.grade)} ${validation.coreSkillBalance.grade}]\n`;

    // ATK↔DEF Pairing Status (NEW)
    const pairingStatus = checkComplementarySkillPairing(blueTeam, orangeTeam, permanentGKIds);
    const pairingGrade = pairingStatus.pairingStatus === 'perfect' ? '🟢 PERFECT' :
                         pairingStatus.pairingStatus === 'acceptable' ? '🟢 OK' : '🔴 VIOLATED';
    const atkWinnerStr = pairingStatus.attackWinner === 'tie' ? 'Tied' :
                         pairingStatus.attackWinner === 'blue' ? 'Blue' : 'Orange';
    const defWinnerStr = pairingStatus.defenseWinner === 'tie' ? 'Tied' :
                         pairingStatus.defenseWinner === 'blue' ? 'Blue' : 'Orange';
    debugLog.value += `ATK↔DEF Pairing:           ${atkWinnerStr} ATK, ${defWinnerStr} DEF  [${pairingGrade}]\n`;
    if (pairingStatus.gameIqGap > PAIRING_CONFIG.GAME_IQ_SOFT_THRESHOLD) {
      debugLog.value += `Game IQ Gap:               ${pairingStatus.gameIqGap.toFixed(2)} (>${PAIRING_CONFIG.GAME_IQ_SOFT_THRESHOLD} soft threshold)  [🟡 NOTE]\n`;
    }

    // Average Rating (NEW)
    debugLog.value += `Average Rating:            Blue ${validation.avgRating.blueAvg.toFixed(2)}, Orange ${validation.avgRating.orangeAvg.toFixed(2)} `;
    debugLog.value += `(gap: ${validation.avgRating.difference.toFixed(2)}) [${gradeEmoji(validation.avgRating.grade)} ${validation.avgRating.grade}]\n`;

    // GK Balance
    debugLog.value += `GK Balance:                Blue ${validation.gkBalance.blueGk.toFixed(2)}, Orange ${validation.gkBalance.orangeGk.toFixed(2)} `;
    debugLog.value += `(gap: ${Math.abs(validation.gkBalance.blueGk - validation.gkBalance.orangeGk).toFixed(2)}) [ℹ️ INFO - rotating]\n`;

    // Position Balance
    debugLog.value += `Position Balance:          ${validation.positionBalance.valid ? '✓ PASS' : '✗ FAIL'} `;
    debugLog.value += `(Blue ${validation.positionBalance.blueStrikers} ST, Orange ${validation.positionBalance.orangeStrikers} ST)\n`;

    // Attribute Balance with grade
    debugLog.value += `Attribute Gaps:            ${validation.attributeGaps.valid ? '✓ PASS' : '⚠️ WARN'} `;
    debugLog.value += `[${gradeEmoji(validation.attributeGaps.grade)} ${validation.attributeGaps.grade}]`;
    if (!validation.attributeGaps.valid) {
      debugLog.value += ` (${validation.attributeGaps.extremeGaps.map(g => `${g.attr}: ${g.gap.toFixed(1)}`).join(', ')})`;
    }
    debugLog.value += '\n';

    // Top 4/Bottom 4 split
    debugLog.value += `Top 4/Bottom 4:            ${extremeSplitResult.valid ? '✓ PASS' : '✗ FAIL'} `;
    debugLog.value += `(${extremeSplitResult.valid ? '2-2 split enforced' : 'imbalanced'})\n`;

    // Core skill margin analysis (for potential flip targeting)
    const coreDetails = calculateCoreSkillDominance(blueTeam, orangeTeam, permanentGKIds);
    debugLog.value += '\n';
    debugLog.value += 'CORE SKILL MARGINS (for potential flip targeting):\n';
    coreDetails.details.forEach(d => {
      const margin = Math.abs(d.blueAvg - d.orangeAvg);
      const winner = d.winner === 'tie' ? 'Tie' : d.winner === 'blue' ? 'Blue' : 'Orange';
      debugLog.value += `  ${d.skill.padEnd(8)}: Blue ${d.blueAvg.toFixed(2)} vs Orange ${d.orangeAvg.toFixed(2)} (gap: ${margin.toFixed(2)}) → ${winner} wins\n`;
    });
    const sortedByMargin = [...coreDetails.details]
      .filter(d => d.winner !== 'tie')
      .sort((a, b) => Math.abs(a.blueAvg - a.orangeAvg) - Math.abs(b.blueAvg - b.orangeAvg));
    if (sortedByMargin.length > 0) {
      debugLog.value += `\n  Easiest to flip: ${sortedByMargin[0].skill} (${Math.abs(sortedByMargin[0].blueAvg - sortedByMargin[0].orangeAvg).toFixed(2)} margin)\n`;
    }

    // ATK↔DEF Pairing Analysis
    debugLog.value += '\n';
    debugLog.value += 'ATK↔DEF PAIRING ANALYSIS:\n';
    const pairing = coreDetails.pairing;
    debugLog.value += `  Attack:   Blue ${pairing.blueAttack.toFixed(2)} vs Orange ${pairing.orangeAttack.toFixed(2)} → `;
    debugLog.value += `${pairing.attackWinner === 'tie' ? 'Tie (within 0.1)' : (pairing.attackWinner === 'blue' ? 'Blue' : 'Orange') + ' wins'}\n`;
    debugLog.value += `  Defense:  Blue ${pairing.blueDefense.toFixed(2)} vs Orange ${pairing.orangeDefense.toFixed(2)} → `;
    debugLog.value += `${pairing.defenseWinner === 'tie' ? 'Tie (within 0.1)' : (pairing.defenseWinner === 'blue' ? 'Blue' : 'Orange') + ' wins'}\n`;
    debugLog.value += `  Game IQ:  Blue ${pairing.blueGameIq.toFixed(2)} vs Orange ${pairing.orangeGameIq.toFixed(2)} → `;
    debugLog.value += `${pairing.gameIqWinner === 'tie' ? 'Tie' : (pairing.gameIqWinner === 'blue' ? 'Blue' : 'Orange') + ' wins'} (gap: ${pairing.gameIqGap.toFixed(2)})\n`;
    debugLog.value += '\n';
    debugLog.value += `  Pairing Status: ${pairing.pairingStatus === 'perfect' ? '✓ PERFECT' : pairing.pairingStatus === 'acceptable' ? '✓ ACCEPTABLE' : '✗ VIOLATED'}\n`;
    debugLog.value += `  Reason: ${pairing.reason}\n`;

    debugLog.value += '\n';
    debugLog.value += `Overall Grade:             ${gradeEmoji(validation.grade)} ${validation.grade} (Score: ${validation.score.toFixed(0)}/100)\n`;

    if (validation.issues.length > 0) {
      debugLog.value += `\n⚠️ Issues:\n`;
      validation.issues.forEach(issue => {
        debugLog.value += `  - ${issue}\n`;
      });
    }

    debugLog.value += '\n';
    debugLog.value += `Pipeline swaps:            ${swapCount}\n`;
    debugLog.value += `Final balance score:       ${balance.toFixed(3)}\n`;
    debugLog.value += '═══════════════════════════════════════════════════════════════\n';
  }

  return {
    blueTeam,
    orangeTeam,
    balance,
    swapCount,
    positionFixed,
    coreSkillFixed,
    attributeFixed,
    validation
  };
}

/**
 * Check for and fix systematic bias where one team dominates most/all metrics
 * Target is ~3-3 metric split (balanced)
 * If one team wins >=4 metrics, attempt to rebalance (max acceptable is 4-2)
 * IMPORTANT: Swaps that would create skill dominance (0-4 or 4-0 on core skills) are rejected
 * Phase 2: Added balance guard to prevent pipeline from destroying SA's good balance
 */
function checkAndFixSystematicBias(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  const BIAS_THRESHOLD = 3; // If one team wins > 3 out of 6 attributes (i.e., >=4), it's biased
  const MAX_BALANCE_DEGRADATION = 0.10; // Phase 2: Maximum allowed balance degradation

  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const gkIdArray = Array.from(gkIdSet);

  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  if (!blueAttrs.hasAttributes || !orangeAttrs.hasAttributes) return false;

  const attributes: Array<'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'> = [
    'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'
  ];

  // Count how many attributes each team "wins" (has higher value)
  let blueWins = 0;
  let orangeWins = 0;
  const gapsByAttr: Array<{ attr: typeof attributes[number]; gap: number; blueHigher: boolean }> = [];

  for (const attr of attributes) {
    const blueVal = blueAttrs[attr] * 10;
    const orangeVal = orangeAttrs[attr] * 10;
    const gap = blueVal - orangeVal;

    if (gap > 0.05) {
      blueWins++;
      gapsByAttr.push({ attr, gap, blueHigher: true });
    } else if (gap < -0.05) {
      orangeWins++;
      gapsByAttr.push({ attr, gap: Math.abs(gap), blueHigher: false });
    }
    // Ties (within 0.05) don't count for either team
  }

  // Check for systematic bias
  if (blueWins <= BIAS_THRESHOLD && orangeWins <= BIAS_THRESHOLD) {
    return false; // No systematic bias
  }

  if (debugLog) {
    debugLog.value += `\n⚠️ SYSTEMATIC BIAS DETECTED: Blue wins ${blueWins}/6 metrics, Orange wins ${orangeWins}/6 metrics\n`;
    debugLog.value += `   Target: ~3-3 split (balanced), max acceptable is 4-2\n`;
  }

  // Sort gaps by size (largest first) - these are the attributes causing the most bias
  gapsByAttr.sort((a, b) => b.gap - a.gap);

  let swapsMade = false;
  const dominantTeam = blueWins > orangeWins ? 'blue' : 'orange';

  // Try to fix by targeting the largest gaps from the dominant team's perspective
  for (const { attr, gap, blueHigher } of gapsByAttr) {
    // Only try to fix if this attribute contributes to the bias (dominant team is higher)
    if ((dominantTeam === 'blue' && blueHigher) || (dominantTeam === 'orange' && !blueHigher)) {
      // Use relaxed criteria to find a swap that reduces this gap
      const swap = findAttributeTargetedSwapRelaxed(
        blueTeam, orangeTeam, attr, gap, gkIdSet
      );

      if (swap) {
        // Execute swap
        const blueIdx = blueTeam.findIndex(p => p.player_id === swap.bluePlayer.player_id);
        const orangeIdx = orangeTeam.findIndex(p => p.player_id === swap.orangePlayer.player_id);

        if (blueIdx !== -1 && orangeIdx !== -1) {
          // SKILL DOMINANCE CHECK (Phase 3): Check CORE skills (Attack/Defense/Game IQ, excludes GK)
          // Must use calculateCoreSkillDominance for consistency with STEP 2, 3, and 5
          const skillStatusBefore = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

          // Temporarily execute the swap
          [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];

          const skillStatusAfter = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

          // Check if swap creates NEW dominance or WORSENS existing dominance
          const createsNewDominance = !skillStatusBefore.isCoreSkillDominated && skillStatusAfter.isCoreSkillDominated;
          const worsensDominance = skillStatusBefore.isCoreSkillDominated && skillStatusAfter.isCoreSkillDominated &&
            Math.abs(skillStatusAfter.blueWins - skillStatusAfter.orangeWins) > Math.abs(skillStatusBefore.blueWins - skillStatusBefore.orangeWins);

          if (createsNewDominance || worsensDominance) {
            // Revert the swap - it would create or worsen skill dominance
            [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
            if (debugLog) {
              // Determine specific reason for rejection
              let reason = '';
              if (skillStatusAfter.pairingViolated && !skillStatusBefore.pairingViolated) {
                reason = 'break ATK↔DEF pairing';
              } else if (skillStatusAfter.existingDominance && !skillStatusBefore.existingDominance) {
                reason = 'create skill dominance';
              } else if (worsensDominance) {
                reason = 'worsen skill dominance';
              } else {
                reason = createsNewDominance ? 'create dominance issue' : 'worsen dominance issue';
              }
              debugLog.value += `   ⚠️ Rejected ${attr} swap: would ${reason} (${skillStatusBefore.blueWins}-${skillStatusBefore.orangeWins} → ${skillStatusAfter.blueWins}-${skillStatusAfter.orangeWins})\n`;
            }
            continue; // Try next attribute
          }

          // Phase 3: Position balance check - prevent creating striker imbalance
          // Check if the swap creates a critical striker imbalance (0 vs 2+)
          const blueStrikersAfter = blueTeam.filter(p => p.primaryPosition === 'ST').length;
          const orangeStrikersAfter = orangeTeam.filter(p => p.primaryPosition === 'ST').length;
          const totalStrikersAfter = blueStrikersAfter + orangeStrikersAfter;

          if (totalStrikersAfter >= 2 && (blueStrikersAfter === 0 || orangeStrikersAfter === 0)) {
            // Revert the swap - it creates a striker imbalance
            [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
            if (debugLog) {
              debugLog.value += `   ⚠️ Rejected ${attr} swap (would create striker imbalance: Blue ${blueStrikersAfter} ST, Orange ${orangeStrikersAfter} ST)\n`;
            }
            continue; // Try next attribute
          }

          // Phase 2: Balance guard - check overall balance degradation
          const balanceBefore = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);
          // Note: swap already executed, so this is "after" balance
          // We need to check if degradation from original is too high
          // Temporarily revert to get "before" balance
          [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
          const balanceBeforeSwap = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);
          // Re-execute swap
          [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];

          if (balanceBefore - balanceBeforeSwap > MAX_BALANCE_DEGRADATION) {
            // Revert the swap - balance degradation too high
            [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
            if (debugLog) {
              debugLog.value += `   ⚠️ Rejected ${attr} swap: balance degradation too high (${balanceBeforeSwap.toFixed(3)} → ${balanceBefore.toFixed(3)}, max: ${MAX_BALANCE_DEGRADATION})\n`;
            }
            continue; // Try next attribute
          }

          // Swap accepted
          swapsMade = true;

          if (debugLog) {
            debugLog.value += `   ✓ Reduced ${attr} gap for bias correction: ${gap.toFixed(2)} → ${swap.newGap.toFixed(2)}\n`;
            debugLog.value += `     Swap: ${swap.bluePlayer.friendly_name} ↔ ${swap.orangePlayer.friendly_name}\n`;
            debugLog.value += `     Skill balance: ${skillStatusBefore.blueWins}-${skillStatusBefore.orangeWins} → ${skillStatusAfter.blueWins}-${skillStatusAfter.orangeWins}\n`;
            debugLog.value += `     Overall balance: ${balanceBeforeSwap.toFixed(3)} → ${balanceBefore.toFixed(3)}\n`;
          }

          // Only make one swap per call to avoid over-correction
          break;
        }
      }
    }
  }

  if (!swapsMade && debugLog) {
    debugLog.value += `   ✗ Could not find valid swaps to correct bias (all candidates would create skill dominance)\n`;
  }

  return swapsMade;
}

/**
 * Validate and fix elite shooter distribution between teams.
 * This is a post-optimization phase that ensures elite shooters (P90+) are fairly distributed.
 * Target: Elite shooter gap of 0-1 (maximum acceptable gap is 1)
 */
function validateAndFixEliteShooterDistribution(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);

  const allPlayers = [...blueTeam, ...orangeTeam];
  const shootingDist = analyzeShootingDistribution(allPlayers);

  const blueElite = blueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  );
  const orangeElite = orangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  );

  const eliteGap = Math.abs(blueElite.length - orangeElite.length);

  // Only fix if gap >= 2 (gap of 1 is acceptable)
  if (eliteGap < 2) return false;

  if (debugLog) {
    debugLog.value += `\n⚠️ ELITE SHOOTER IMBALANCE DETECTED\n`;
    debugLog.value += `   Blue elite shooters: ${blueElite.length} (${blueElite.map(p => p.friendly_name).join(', ') || 'none'})\n`;
    debugLog.value += `   Orange elite shooters: ${orangeElite.length} (${orangeElite.map(p => p.friendly_name).join(', ') || 'none'})\n`;
    debugLog.value += `   Gap: ${eliteGap} (target: 0-1)\n`;
  }

  // Determine which team has more elite shooters
  const teamWithMore = blueElite.length > orangeElite.length ? 'blue' : 'orange';
  const elitePlayers = teamWithMore === 'blue' ? blueElite : orangeElite;
  const sourceTeam = teamWithMore === 'blue' ? blueTeam : orangeTeam;
  const targetTeam = teamWithMore === 'blue' ? orangeTeam : blueTeam;

  // Try to swap an elite shooter with a similar-rated non-elite player from the other team
  for (const elite of elitePlayers) {
    // Skip permanent GKs
    if (gkIdSet.has(elite.player_id)) continue;

    const eliteRating = elite.threeLayerRating ?? 5;
    const eliteTier = elite.tier ?? 3;

    for (const target of targetTeam) {
      // Skip permanent GKs
      if (gkIdSet.has(target.player_id)) continue;

      const targetShooting = target.derived_attributes?.shooting || 0;

      // Skip if target is already an elite shooter
      if (targetShooting >= shootingDist.percentiles.p90) continue;

      const targetRating = target.threeLayerRating ?? 5;
      const targetTier = target.tier ?? 3;

      // Check if ratings are close enough for a valid swap (within same tier or adjacent)
      const tierDiff = Math.abs(eliteTier - targetTier);
      const ratingGap = Math.abs(eliteRating - targetRating);

      // Allow swaps within same tier, or adjacent tiers if rating gap is small
      if (tierDiff > 1 || (tierDiff === 1 && ratingGap > 0.5)) continue;

      // Verify the swap doesn't worsen skill balance
      const beforeSkills = calculateSkillDominance(blueTeam, orangeTeam);

      // Execute swap temporarily
      const eliteIdx = sourceTeam.findIndex(p => p.player_id === elite.player_id);
      const targetIdx = targetTeam.findIndex(p => p.player_id === target.player_id);

      if (eliteIdx === -1 || targetIdx === -1) continue;

      [sourceTeam[eliteIdx], targetTeam[targetIdx]] = [targetTeam[targetIdx], sourceTeam[eliteIdx]];

      const afterSkills = calculateSkillDominance(blueTeam, orangeTeam);

      // Reject if this creates or worsens skill dominance
      if (afterSkills.isSkillDominated && !beforeSkills.isSkillDominated) {
        // Revert swap
        [sourceTeam[eliteIdx], targetTeam[targetIdx]] = [targetTeam[targetIdx], sourceTeam[eliteIdx]];
        if (debugLog) {
          debugLog.value += `   ✗ Rejected ${elite.friendly_name} ↔ ${target.friendly_name} (would create skill dominance)\n`;
        }
        continue;
      }

      // Swap accepted
      if (debugLog) {
        debugLog.value += `   ✓ Elite shooter swap: ${elite.friendly_name} (T${eliteTier}, shooting: ${(elite.derived_attributes?.shooting || 0).toFixed(2)}) ↔ `;
        debugLog.value += `${target.friendly_name} (T${targetTier}, shooting: ${targetShooting.toFixed(2)})\n`;
        debugLog.value += `     Skill balance: ${beforeSkills.blueWins}-${beforeSkills.orangeWins} → ${afterSkills.blueWins}-${afterSkills.orangeWins}\n`;
      }

      return true;
    }
  }

  if (debugLog) {
    debugLog.value += `   ✗ Could not find valid swap to fix elite shooter imbalance\n`;
  }

  return false;
}

/**
 * Check for and fix skill bias where one team dominates most/all skill metrics.
 * Target is 2-2 skill split (balanced), max acceptable is 3-1.
 * Skills: Attack, Defense, Game IQ, GK
 * Phase 2: Added balance guard to prevent pipeline from destroying SA's good balance
 */
function checkAndFixSkillBias(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  const SKILL_BIAS_THRESHOLD = 2; // If one team wins > 2 out of 4 skills (i.e., >=3), it's biased
  const MAX_BALANCE_DEGRADATION = 0.12; // Phase 2: Maximum allowed balance degradation

  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const gkIdArray = Array.from(gkIdSet);

  const skillStatus = calculateSkillDominance(blueTeam, orangeTeam);

  // No bias if balanced (2-2 or better)
  if (skillStatus.blueWins <= SKILL_BIAS_THRESHOLD && skillStatus.orangeWins <= SKILL_BIAS_THRESHOLD) {
    return false;
  }

  if (debugLog) {
    debugLog.value += `\n⚠️ SKILL BIAS DETECTED: Blue wins ${skillStatus.blueWins}/4, Orange wins ${skillStatus.orangeWins}/4\n`;
    debugLog.value += `   Target: 2-2 split (balanced), max acceptable is 3-1\n`;
  }

  const dominantTeam = skillStatus.blueWins > skillStatus.orangeWins ? 'blue' : 'orange';
  const dominantTeamPlayers = dominantTeam === 'blue' ? blueTeam : orangeTeam;
  const weakerTeamPlayers = dominantTeam === 'blue' ? orangeTeam : blueTeam;

  // Calculate which skills the dominant team is winning
  const blueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
  const orangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;
  const blueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
  const orangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;
  const blueGk = blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;
  const orangeGk = orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  // Find the skill with the largest gap favoring the dominant team
  const skillGaps: Array<{ skill: string; gap: number; blueHigher: boolean }> = [];

  if (Math.abs(blueAttack - orangeAttack) > 0.1) {
    skillGaps.push({ skill: 'attack', gap: Math.abs(blueAttack - orangeAttack), blueHigher: blueAttack > orangeAttack });
  }
  if (Math.abs(blueDefense - orangeDefense) > 0.1) {
    skillGaps.push({ skill: 'defense', gap: Math.abs(blueDefense - orangeDefense), blueHigher: blueDefense > orangeDefense });
  }
  if (Math.abs(blueGameIq - orangeGameIq) > 0.1) {
    skillGaps.push({ skill: 'gameIq', gap: Math.abs(blueGameIq - orangeGameIq), blueHigher: blueGameIq > orangeGameIq });
  }
  if (Math.abs(blueGk - orangeGk) > 0.1) {
    skillGaps.push({ skill: 'gk', gap: Math.abs(blueGk - orangeGk), blueHigher: blueGk > orangeGk });
  }

  // Sort by gap size (largest first)
  skillGaps.sort((a, b) => b.gap - a.gap);

  // Try to find a swap that reduces the dominant team's advantage in the largest gap skill
  for (const { skill, gap, blueHigher } of skillGaps) {
    // Only fix if this skill contributes to the bias
    if ((dominantTeam === 'blue' && !blueHigher) || (dominantTeam === 'orange' && blueHigher)) {
      continue;
    }

    // Find players to swap: take a strong player from dominant team, swap with weaker team player
    for (const dominantPlayer of dominantTeamPlayers) {
      if (gkIdSet.has(dominantPlayer.player_id)) continue;

      const dominantSkillValue = skill === 'attack' ? (dominantPlayer.attack_rating ?? 5) :
                                  skill === 'defense' ? (dominantPlayer.defense_rating ?? 5) :
                                  skill === 'gameIq' ? (dominantPlayer.game_iq_rating ?? 5) :
                                  (dominantPlayer.gk_rating ?? 5);

      // Only consider players above team average in this skill
      const teamAvg = dominantTeam === 'blue' ?
        (skill === 'attack' ? blueAttack : skill === 'defense' ? blueDefense : skill === 'gameIq' ? blueGameIq : blueGk) :
        (skill === 'attack' ? orangeAttack : skill === 'defense' ? orangeDefense : skill === 'gameIq' ? orangeGameIq : orangeGk);

      if (dominantSkillValue < teamAvg) continue;

      for (const weakerPlayer of weakerTeamPlayers) {
        if (gkIdSet.has(weakerPlayer.player_id)) continue;

        // Check tier compatibility
        const tierDiff = Math.abs((dominantPlayer.tier ?? 3) - (weakerPlayer.tier ?? 3));
        if (tierDiff > 1) continue;

        // Check overall rating compatibility
        const ratingDiff = Math.abs((dominantPlayer.threeLayerRating ?? 5) - (weakerPlayer.threeLayerRating ?? 5));
        if (ratingDiff > 0.8) continue;

        // Simulate swap
        const dominantIdx = dominantTeamPlayers.findIndex(p => p.player_id === dominantPlayer.player_id);
        const weakerIdx = weakerTeamPlayers.findIndex(p => p.player_id === weakerPlayer.player_id);

        if (dominantIdx === -1 || weakerIdx === -1) continue;

        // Phase 2: Capture balance before swap
        const balanceBeforeSwap = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);

        // Execute swap
        [dominantTeamPlayers[dominantIdx], weakerTeamPlayers[weakerIdx]] =
          [weakerTeamPlayers[weakerIdx], dominantTeamPlayers[dominantIdx]];

        // Check if this improves skill balance
        const newSkillStatus = calculateSkillDominance(blueTeam, orangeTeam);

        // Phase 2: Check balance after swap
        const balanceAfterSwap = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);

        // Accept if we reduced dominance without creating new dominance AND balance degradation is acceptable
        const oldDominance = Math.abs(skillStatus.blueWins - skillStatus.orangeWins);
        const newDominance = Math.abs(newSkillStatus.blueWins - newSkillStatus.orangeWins);
        const balanceDegradation = balanceAfterSwap - balanceBeforeSwap;

        if ((newDominance < oldDominance || (newDominance === oldDominance && !newSkillStatus.isSkillDominated)) &&
            balanceDegradation <= MAX_BALANCE_DEGRADATION) {
          if (debugLog) {
            debugLog.value += `   ✓ Skill bias swap for ${skill}: ${dominantPlayer.friendly_name} ↔ ${weakerPlayer.friendly_name}\n`;
            debugLog.value += `     Skill balance: ${skillStatus.blueWins}-${skillStatus.orangeWins} → ${newSkillStatus.blueWins}-${newSkillStatus.orangeWins}\n`;
            debugLog.value += `     Overall balance: ${balanceBeforeSwap.toFixed(3)} → ${balanceAfterSwap.toFixed(3)}\n`;
          }
          return true;
        }

        // Phase 2: Log rejection reason if balance degradation was the issue
        if ((newDominance < oldDominance || (newDominance === oldDominance && !newSkillStatus.isSkillDominated)) &&
            balanceDegradation > MAX_BALANCE_DEGRADATION && debugLog) {
          debugLog.value += `   ⚠️ Rejected ${skill} swap: balance degradation too high (${balanceBeforeSwap.toFixed(3)} → ${balanceAfterSwap.toFixed(3)}, max: ${MAX_BALANCE_DEGRADATION})\n`;
        }

        // Revert swap
        [dominantTeamPlayers[dominantIdx], weakerTeamPlayers[weakerIdx]] =
          [weakerTeamPlayers[weakerIdx], dominantTeamPlayers[dominantIdx]];
      }
    }
  }

  if (debugLog) {
    debugLog.value += `   ✗ Could not find valid swaps to correct skill bias\n`;
  }

  return false;
}

// ============================================================================
// TOP 4 / BOTTOM 4 SPLIT ENFORCEMENT
// User requirement: Top 4 and Bottom 4 players must be split 2-2 between teams
// Middle players (ranks 5-14 for 18 players) can be freely optimized for balance
// ============================================================================

const EXTREME_SPLIT_SIZE = 4; // Top 4 and Bottom 4 must be split 2-2

/**
 * Validate that top 4 and bottom 4 players are split 2-2 between teams.
 * This is a HARD CONSTRAINT that must be satisfied.
 *
 * @param blueTeam - Current blue team
 * @param orangeTeam - Current orange team
 * @param allPlayersSorted - All players sorted by threeLayerRating (descending)
 * @returns Validation result with issues if any
 */
function validateTopBottomSplit(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  allPlayersSorted: PlayerWithRating[]
): { valid: boolean; issues: string[]; top4Split: { blue: number; orange: number }; bottom4Split: { blue: number; orange: number } } {
  const issues: string[] = [];

  // Get top 4 and bottom 4 by rank (not tier)
  const top4 = allPlayersSorted.slice(0, EXTREME_SPLIT_SIZE);
  const bottom4 = allPlayersSorted.slice(-EXTREME_SPLIT_SIZE);

  // Count how many top 4 are on each team
  const blueTopCount = top4.filter(p =>
    blueTeam.some(bp => bp.player_id === p.player_id)
  ).length;
  const orangeTopCount = EXTREME_SPLIT_SIZE - blueTopCount;

  // Count how many bottom 4 are on each team
  const blueBottomCount = bottom4.filter(p =>
    blueTeam.some(bp => bp.player_id === p.player_id)
  ).length;
  const orangeBottomCount = EXTREME_SPLIT_SIZE - blueBottomCount;

  // Check top 4 are split 2-2
  if (blueTopCount !== 2) {
    issues.push(`Top 4 split is ${blueTopCount}-${orangeTopCount}, should be 2-2`);
  }

  // Check bottom 4 are split 2-2
  if (blueBottomCount !== 2) {
    issues.push(`Bottom 4 split is ${blueBottomCount}-${orangeBottomCount}, should be 2-2`);
  }

  return {
    valid: issues.length === 0,
    issues,
    top4Split: { blue: blueTopCount, orange: orangeTopCount },
    bottom4Split: { blue: blueBottomCount, orange: orangeBottomCount }
  };
}

/**
 * Fix top 4 or bottom 4 split to ensure 2-2 distribution.
 * If one team has 3+ from extreme group, swap one with a middle-ranked player from other team.
 * Phase 2: Added balance guard but with higher tolerance since this is a user's hard requirement
 *
 * @param blueTeam - Current blue team (will be modified)
 * @param orangeTeam - Current orange team (will be modified)
 * @param allPlayersSorted - All players sorted by threeLayerRating (descending)
 * @param permanentGKIds - Set of permanent GK player IDs to exclude
 * @param isTop - true for top 4, false for bottom 4
 * @param debugLog - Optional debug log
 * @returns true if a fix was made
 */
function fixExtremeSplit(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  allPlayersSorted: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  isTop: boolean,
  debugLog?: { value: string }
): boolean {
  const MAX_BALANCE_DEGRADATION = 0.15; // Phase 2: Higher tolerance since this is a hard constraint
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);
  const gkIdArray = Array.from(gkIdSet);
  const label = isTop ? 'Top 4' : 'Bottom 4';

  // Get the extreme group (top 4 or bottom 4)
  const extreme4 = isTop
    ? allPlayersSorted.slice(0, EXTREME_SPLIT_SIZE)
    : allPlayersSorted.slice(-EXTREME_SPLIT_SIZE);

  // Get middle players (not in top 4 or bottom 4)
  const middlePlayers = allPlayersSorted.slice(EXTREME_SPLIT_SIZE, -EXTREME_SPLIT_SIZE);

  // Find which team has too many from extreme group
  const blueExtreme = extreme4.filter(p => blueTeam.some(bp => bp.player_id === p.player_id));
  const orangeExtreme = extreme4.filter(p => orangeTeam.some(op => op.player_id === p.player_id));

  let dominantTeam: 'blue' | 'orange' | null = null;
  let excessPlayers: PlayerWithRating[] = [];

  if (blueExtreme.length > 2) {
    dominantTeam = 'blue';
    // Select which players to swap out (prefer middle of the extreme group)
    const sorted = [...blueExtreme].sort((a, b) => b.threeLayerRating - a.threeLayerRating);
    excessPlayers = sorted.slice(2); // All beyond the first 2
  } else if (orangeExtreme.length > 2) {
    dominantTeam = 'orange';
    const sorted = [...orangeExtreme].sort((a, b) => b.threeLayerRating - a.threeLayerRating);
    excessPlayers = sorted.slice(2);
  }

  if (!dominantTeam || excessPlayers.length === 0) {
    return false; // Already balanced or no fix needed
  }

  // For each excess player, find a suitable middle player from the other team to swap
  const otherTeam = dominantTeam === 'blue' ? orangeTeam : blueTeam;
  const dominantTeamArray = dominantTeam === 'blue' ? blueTeam : orangeTeam;

  for (const playerToSwapOut of excessPlayers) {
    if (gkIdSet.has(playerToSwapOut.player_id)) continue;

    // Find middle players on the other team (not in extreme groups, not GK)
    const middleCandidates = middlePlayers.filter(p =>
      otherTeam.some(op => op.player_id === p.player_id) && !gkIdSet.has(p.player_id)
    );

    // Sort by rating similarity
    const sortedCandidates = middleCandidates.sort((a, b) =>
      Math.abs(a.threeLayerRating - playerToSwapOut.threeLayerRating) -
      Math.abs(b.threeLayerRating - playerToSwapOut.threeLayerRating)
    );

    if (sortedCandidates.length === 0) {
      if (debugLog) {
        debugLog.value += `   ⚠️ No middle candidates to swap for ${playerToSwapOut.friendly_name}\n`;
      }
      continue;
    }

    // Phase 2: Try candidates until we find one with acceptable balance degradation
    const dominantIdx = dominantTeamArray.findIndex(p => p.player_id === playerToSwapOut.player_id);

    for (const playerToSwapIn of sortedCandidates) {
      const otherIdx = otherTeam.findIndex(p => p.player_id === playerToSwapIn.player_id);

      if (dominantIdx !== -1 && otherIdx !== -1) {
        // Phase 2: Capture balance before swap
        const balanceBeforeSwap = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);

        // Phase 3: Capture skill dominance before swap
        const skillStatusBefore = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

        // Execute swap
        [dominantTeamArray[dominantIdx], otherTeam[otherIdx]] = [otherTeam[otherIdx], dominantTeamArray[dominantIdx]];

        // Phase 2: Check balance after swap
        const balanceAfterSwap = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);
        const balanceDegradation = balanceAfterSwap - balanceBeforeSwap;

        // Phase 3: Check skill dominance after swap
        const skillStatusAfter = calculateCoreSkillDominance(blueTeam, orangeTeam, gkIdSet);

        // Phase 3: Check for skill dominance creation/worsening
        const createsNewDominance = !skillStatusBefore.isCoreSkillDominated && skillStatusAfter.isCoreSkillDominated;
        const worsensDominance = skillStatusBefore.isCoreSkillDominated && skillStatusAfter.isCoreSkillDominated &&
          Math.abs(skillStatusAfter.blueWins - skillStatusAfter.orangeWins) > Math.abs(skillStatusBefore.blueWins - skillStatusBefore.orangeWins);

        if (balanceDegradation <= MAX_BALANCE_DEGRADATION && !createsNewDominance && !worsensDominance) {
          if (debugLog) {
            debugLog.value += `   ✓ Fixed ${label} split: ${playerToSwapOut.friendly_name} (${label}) ↔ ${playerToSwapIn.friendly_name} (middle)\n`;
            debugLog.value += `     Balance: ${balanceBeforeSwap.toFixed(3)} → ${balanceAfterSwap.toFixed(3)}\n`;
          }
          return true; // One swap should be enough to go from 3-1 to 2-2
        }

        // Revert swap and try next candidate
        [dominantTeamArray[dominantIdx], otherTeam[otherIdx]] = [otherTeam[otherIdx], dominantTeamArray[dominantIdx]];

        if (debugLog) {
          if (createsNewDominance || worsensDominance) {
            debugLog.value += `   ⚠️ Rejected swap with ${playerToSwapIn.friendly_name}: would ${createsNewDominance ? 'create' : 'worsen'} skill dominance (${skillStatusBefore.blueWins}-${skillStatusBefore.orangeWins} → ${skillStatusAfter.blueWins}-${skillStatusAfter.orangeWins})\n`;
          } else {
            debugLog.value += `   ⚠️ Rejected swap with ${playerToSwapIn.friendly_name}: balance degradation too high (${balanceBeforeSwap.toFixed(3)} → ${balanceAfterSwap.toFixed(3)})\n`;
          }
        }
      }
    }
  }

  if (debugLog) {
    debugLog.value += `   ✗ Could not fix ${label} split\n`;
  }
  return false;
}

/**
 * Validate and fix top 4 / bottom 4 splits.
 * This is the main entry point for extreme split enforcement.
 */
function validateAndFixExtremeSplits(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  allPlayersSorted: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): { valid: boolean; fixesMade: number } {
  let fixesMade = 0;

  // First, validate current state
  let validation = validateTopBottomSplit(blueTeam, orangeTeam, allPlayersSorted);

  if (debugLog && !validation.valid) {
    debugLog.value += `\n🎯 TOP/BOTTOM SPLIT CHECK:\n`;
    debugLog.value += `   Current: Top 4 = ${validation.top4Split.blue}-${validation.top4Split.orange}, Bottom 4 = ${validation.bottom4Split.blue}-${validation.bottom4Split.orange}\n`;
    debugLog.value += `   Target: 2-2 for both\n`;
  }

  // Fix top 4 if needed
  if (validation.top4Split.blue !== 2) {
    if (fixExtremeSplit(blueTeam, orangeTeam, allPlayersSorted, permanentGKIds, true, debugLog)) {
      fixesMade++;
    }
  }

  // Re-validate after top fix
  validation = validateTopBottomSplit(blueTeam, orangeTeam, allPlayersSorted);

  // Fix bottom 4 if needed
  if (validation.bottom4Split.blue !== 2) {
    if (fixExtremeSplit(blueTeam, orangeTeam, allPlayersSorted, permanentGKIds, false, debugLog)) {
      fixesMade++;
    }
  }

  // Final validation
  validation = validateTopBottomSplit(blueTeam, orangeTeam, allPlayersSorted);

  if (debugLog) {
    if (validation.valid) {
      debugLog.value += `   ✓ ${label('Top 4')}: ${validation.top4Split.blue}-${validation.top4Split.orange}, ${label('Bottom 4')}: ${validation.bottom4Split.blue}-${validation.bottom4Split.orange}\n`;
    } else {
      debugLog.value += `   ⚠️ Could not achieve 2-2 splits: ${validation.issues.join(', ')}\n`;
    }
  }

  return { valid: validation.valid, fixesMade };

  function label(group: string): string {
    return group;
  }
}

/**
 * Fix extreme tier concentration by swapping players when one team has ALL players from a tier.
 *
 * NOTE: This now ONLY checks Tier 1 (top) and the last tier (bottom).
 * Middle tiers are IGNORED as the user doesn't care about tier distribution for middle players.
 * The new validateAndFixExtremeSplits() handles top 4 / bottom 4 by RANK instead.
 *
 * The problem: SA can get stuck with one team having ALL players from a tier because:
 * 1. Individual swaps within the tier maintain the "all on one team" state
 * 2. Cross-tier swaps don't happen because of rating differences
 *
 * Solution: Force a cross-tier swap between the most concentrated tier's players
 */
function fixExtremeTierConcentration(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);

  const allPlayers = [...blueTeam, ...orangeTeam];

  // Only check Tier 1 (top) and the last tier (bottom)
  // Middle tiers (2, 3, 4) are IGNORED per user requirements - only top 4 / bottom 4 by RANK matters
  const lastTier = Math.max(...allPlayers.map(p => p.tier || 1));
  const tiers = lastTier > 1 ? [1, lastTier] : [1];

  // Find tiers with extreme concentration:
  // - 100% concentration (ALL players) for tiers with 2-3 players
  // - ≥75% concentration for tiers with 4+ players
  const concentratedTiers: Array<{
    tier: number;
    team: 'blue' | 'orange';
    players: PlayerWithRating[];
    otherTeam: PlayerWithRating[];
    concentration: number; // percentage
  }> = [];

  for (const tier of tiers) {
    const playersInTier = allPlayers.filter(p => p.tier === tier);
    if (playersInTier.length < 2) continue; // Need 2+ players for meaningful concentration

    const blueInTier = blueTeam.filter(p => p.tier === tier);
    const orangeInTier = orangeTeam.filter(p => p.tier === tier);

    // Calculate concentration thresholds based on tier size
    const totalInTier = playersInTier.length;
    const blueConcentration = blueInTier.length / totalInTier;
    const orangeConcentration = orangeInTier.length / totalInTier;

    // For tiers with 4+ players, 75% concentration is extreme
    // For tiers with 2-3 players, only 100% concentration is extreme
    const concentrationThreshold = totalInTier >= 4 ? 0.75 : 1.0;

    if (blueConcentration >= concentrationThreshold) {
      concentratedTiers.push({
        tier,
        team: 'blue',
        players: blueInTier,
        otherTeam: orangeTeam,
        concentration: blueConcentration * 100
      });
    } else if (orangeConcentration >= concentrationThreshold) {
      concentratedTiers.push({
        tier,
        team: 'orange',
        players: orangeInTier,
        otherTeam: blueTeam,
        concentration: orangeConcentration * 100
      });
    }
  }

  if (concentratedTiers.length === 0) {
    return false; // No extreme concentration
  }

  if (debugLog) {
    debugLog.value += `\n⚠️ TIER CONCENTRATION DETECTED:\n`;
    for (const { tier, team, players, concentration } of concentratedTiers) {
      debugLog.value += `   ${team.toUpperCase()} has ${players.length} Tier ${tier} players (${concentration.toFixed(0)}% concentration)\n`;
    }
  }

  let swapsMade = false;

  // Try to fix each concentrated tier by finding a cross-tier swap
  for (const { tier, team, players } of concentratedTiers) {
    // Find a player from the concentrated tier to swap out
    // Prefer middle-quality players to minimize disruption
    const sortedByRating = [...players].sort((a, b) => b.threeLayerRating - a.threeLayerRating);
    const middleIdx = Math.floor(sortedByRating.length / 2);

    // Try players starting from middle, then expanding outward
    const playerOrder: PlayerWithRating[] = [];
    playerOrder.push(sortedByRating[middleIdx]);
    for (let offset = 1; offset <= sortedByRating.length / 2; offset++) {
      if (middleIdx + offset < sortedByRating.length) playerOrder.push(sortedByRating[middleIdx + offset]);
      if (middleIdx - offset >= 0) playerOrder.push(sortedByRating[middleIdx - offset]);
    }

    for (const playerToSwapOut of playerOrder) {
      // Skip GKs
      if (gkIdSet.has(playerToSwapOut.player_id)) continue;

      // Find a player from the other team in a DIFFERENT tier to swap in
      const otherTeamNonGK = (team === 'blue' ? orangeTeam : blueTeam).filter(p =>
        !gkIdSet.has(p.player_id) && p.tier !== tier
      );

      // Try to find a player with similar overall rating but different tier
      const ratingTolerance = 2.0; // Allow more tolerance for tier concentration fixes
      const candidates = otherTeamNonGK.filter(p =>
        Math.abs(p.threeLayerRating - playerToSwapOut.threeLayerRating) <= ratingTolerance
      ).sort((a, b) =>
        // Prefer closer ratings
        Math.abs(a.threeLayerRating - playerToSwapOut.threeLayerRating) -
        Math.abs(b.threeLayerRating - playerToSwapOut.threeLayerRating)
      );

      if (candidates.length === 0) continue;

      // BALANCE PRESERVATION: Calculate balance before trying any swap
      const MAX_BALANCE_DEGRADATION = 0.15; // Don't worsen balance by more than this
      const gkIdArray = Array.from(gkIdSet);
      const balanceBefore = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);

      // Try candidates in order until we find one that doesn't wreck balance
      let foundValidSwap = false;
      for (const playerToSwapIn of candidates) {
        // Execute the swap temporarily
        let blueIdx: number, orangeIdx: number;
        if (team === 'blue') {
          blueIdx = blueTeam.findIndex(p => p.player_id === playerToSwapOut.player_id);
          orangeIdx = orangeTeam.findIndex(p => p.player_id === playerToSwapIn.player_id);
          if (blueIdx === -1 || orangeIdx === -1) continue;
          [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
        } else {
          orangeIdx = orangeTeam.findIndex(p => p.player_id === playerToSwapOut.player_id);
          blueIdx = blueTeam.findIndex(p => p.player_id === playerToSwapIn.player_id);
          if (orangeIdx === -1 || blueIdx === -1) continue;
          [orangeTeam[orangeIdx], blueTeam[blueIdx]] = [blueTeam[blueIdx], orangeTeam[orangeIdx]];
        }

        // Calculate balance after swap
        const balanceAfter = calculateTierBalanceScore(blueTeam, orangeTeam, gkIdArray);
        const balanceDegradation = balanceAfter - balanceBefore;

        // Check if swap is acceptable (doesn't worsen balance too much)
        if (balanceDegradation <= MAX_BALANCE_DEGRADATION) {
          // Swap accepted - it fixes tier concentration without wrecking balance
          swapsMade = true;
          foundValidSwap = true;
          if (debugLog) {
            debugLog.value += `   ✓ Fixed Tier ${tier} concentration: ${playerToSwapOut.friendly_name} (Tier ${tier}) ↔ ${playerToSwapIn.friendly_name} (Tier ${playerToSwapIn.tier})\n`;
            debugLog.value += `     Balance impact: ${balanceBefore.toFixed(3)} → ${balanceAfter.toFixed(3)} (${balanceDegradation >= 0 ? '+' : ''}${balanceDegradation.toFixed(3)})\n`;
          }
          break; // Found a valid swap for this concentrated tier
        } else {
          // Swap rejected - revert it
          if (team === 'blue') {
            [blueTeam[blueIdx], orangeTeam[orangeIdx]] = [orangeTeam[orangeIdx], blueTeam[blueIdx]];
          } else {
            [orangeTeam[orangeIdx], blueTeam[blueIdx]] = [blueTeam[blueIdx], orangeTeam[orangeIdx]];
          }
          if (debugLog) {
            debugLog.value += `   ⚠️ Rejected swap ${playerToSwapOut.friendly_name} ↔ ${playerToSwapIn.friendly_name}: balance degradation too high (${balanceDegradation.toFixed(3)} > ${MAX_BALANCE_DEGRADATION})\n`;
          }
        }
      }

      if (foundValidSwap) break; // Move to next concentrated tier
    }
  }

  if (!swapsMade && debugLog) {
    debugLog.value += `   ✗ Could not find valid swaps to fix tier concentration (all candidates would worsen balance)\n`;
  }

  return swapsMade;
}

/**
 * Final safety net: Check and fix skill dominance (one team winning all 4 core skills)
 * This runs LAST after all other fixes to ensure skill balance is maintained
 *
 * If one team dominates all 4 skills, try to swap players to restore balance
 */
function checkAndFixSkillDominance(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  permanentGKIds: Set<string> | string[],
  debugLog?: { value: string }
): boolean {
  // Convert to Set if array
  const gkIdSet = permanentGKIds instanceof Set ? permanentGKIds : new Set(permanentGKIds);

  const skillStatus = calculateSkillDominance(blueTeam, orangeTeam);

  if (!skillStatus.isSkillDominated) {
    return false; // No skill dominance issue
  }

  const dominantTeam = skillStatus.blueWins > skillStatus.orangeWins ? 'blue' : 'orange';

  if (debugLog) {
    debugLog.value += `\n🎯 SKILL DOMINANCE DETECTED: ${dominantTeam.toUpperCase()} wins ${skillStatus.blueWins > skillStatus.orangeWins ? skillStatus.blueWins : skillStatus.orangeWins}/4 skills\n`;
    debugLog.value += `   Target: balanced skill distribution (ideally 2-2 or 3-1)\n`;
  }

  // Find players who can be swapped to improve skill balance
  // The goal is to find a swap that reduces the dominant team's skill advantage
  const dominantTeamPlayers = dominantTeam === 'blue' ? blueTeam : orangeTeam;
  const otherTeamPlayers = dominantTeam === 'blue' ? orangeTeam : blueTeam;

  // Sort players by their skill contribution (average of all 4 skills)
  const getPlayerSkillAvg = (p: PlayerWithRating) =>
    ((p.attack_rating ?? 5) + (p.defense_rating ?? 5) + (p.game_iq_rating ?? 5) + (p.gk_rating ?? 5)) / 4;

  // Find high-skill players from dominant team and low-skill players from other team
  const dominantNonGK = dominantTeamPlayers
    .filter(p => !gkIdSet.has(p.player_id))
    .sort((a, b) => getPlayerSkillAvg(b) - getPlayerSkillAvg(a)); // High to low

  const otherNonGK = otherTeamPlayers
    .filter(p => !gkIdSet.has(p.player_id))
    .sort((a, b) => getPlayerSkillAvg(a) - getPlayerSkillAvg(b)); // Low to high

  // Try swaps starting with the most impactful players
  for (const playerFromDominant of dominantNonGK) {
    for (const playerFromOther of otherNonGK) {
      // Check rating tolerance - don't sacrifice overall balance too much
      const ratingDiff = Math.abs(playerFromDominant.threeLayerRating - playerFromOther.threeLayerRating);
      if (ratingDiff > 2.0) continue;

      // Simulate the swap
      const domIdx = dominantTeamPlayers.findIndex(p => p.player_id === playerFromDominant.player_id);
      const othIdx = otherTeamPlayers.findIndex(p => p.player_id === playerFromOther.player_id);

      if (domIdx === -1 || othIdx === -1) continue;

      // Execute swap temporarily
      [dominantTeamPlayers[domIdx], otherTeamPlayers[othIdx]] = [otherTeamPlayers[othIdx], dominantTeamPlayers[domIdx]];

      // Check if skill balance improved
      const afterSkills = calculateSkillDominance(blueTeam, orangeTeam);

      if (!afterSkills.isSkillDominated) {
        // Swap fixed the problem!
        if (debugLog) {
          debugLog.value += `   ✓ Fixed skill dominance: ${playerFromDominant.friendly_name} ↔ ${playerFromOther.friendly_name}\n`;
          debugLog.value += `     Skill balance: ${skillStatus.blueWins}-${skillStatus.orangeWins} → ${afterSkills.blueWins}-${afterSkills.orangeWins}\n`;
        }
        return true;
      }

      // Swap didn't help enough, revert it
      [dominantTeamPlayers[domIdx], otherTeamPlayers[othIdx]] = [otherTeamPlayers[othIdx], dominantTeamPlayers[domIdx]];
    }
  }

  if (debugLog) {
    debugLog.value += `   ✗ Could not find valid swaps to fix skill dominance\n`;
  }

  return false;
}

// ============================================================================
// END PHASE 4
// ============================================================================

/**
 * Validate tier distribution to prevent extreme concentrations
 * Returns true if the distribution is fair:
 * 1. No team has ALL players from any tier with 2+ players
 * 2. No team has all the worst players from tiers with significant rating spreads
 */
function validateTierDistribution(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[]): boolean {
  const QUALITY_CONCENTRATION_THRESHOLD = 1.5; // Rating spread threshold for quality checking (relaxed)
  
  // Count players by tier for each team
  const blueTierCounts = new Map<number, number>();
  const orangeTierCounts = new Map<number, number>();
  const totalTierCounts = new Map<number, number>();
  const tierPlayers = new Map<number, PlayerWithRating[]>();

  // Collect all players by tier
  const allPlayers = [...blueTeam, ...orangeTeam];
  allPlayers.forEach(player => {
    const tier = player.tier ?? 1;
    if (!tierPlayers.has(tier)) {
      tierPlayers.set(tier, []);
    }
    tierPlayers.get(tier)!.push(player);
  });

  // Count blue team players by tier
  blueTeam.forEach(player => {
    const tier = player.tier ?? 1;
    blueTierCounts.set(tier, (blueTierCounts.get(tier) || 0) + 1);
    totalTierCounts.set(tier, (totalTierCounts.get(tier) || 0) + 1);
  });

  // Count orange team players by tier
  orangeTeam.forEach(player => {
    const tier = player.tier ?? 1;
    orangeTierCounts.set(tier, (orangeTierCounts.get(tier) || 0) + 1);
    totalTierCounts.set(tier, (totalTierCounts.get(tier) || 0) + 1);
  });

  // Check each tier for concentration violations
  for (const [tier, totalCount] of totalTierCounts) {
    // Only check tiers with 2+ players (single-player tiers can go to either team)
    if (totalCount >= 2) {
      const blueCount = blueTierCounts.get(tier) || 0;
      const orangeCount = orangeTierCounts.get(tier) || 0;
      
      // Check if one team has ALL players from this tier
      if (blueCount === totalCount && orangeCount === 0) {
        return false; // Blue has all players from this tier
      }
      if (orangeCount === totalCount && blueCount === 0) {
        return false; // Orange has all players from this tier
      }

      // Check for quality concentration in tiers with 3+ players
      if (totalCount >= 3) {
        const playersInTier = tierPlayers.get(tier) || [];
        const sortedByRating = [...playersInTier].sort((a, b) => b.threeLayerRating - a.threeLayerRating);

        const highestRating = sortedByRating[0].threeLayerRating;
        const lowestRating = sortedByRating[sortedByRating.length - 1].threeLayerRating;
        const ratingSpread = highestRating - lowestRating;

        // If there's a significant rating spread, check for quality concentration
        if (ratingSpread > QUALITY_CONCENTRATION_THRESHOLD) {
          // Identify bottom half of players in tier (more comprehensive than just bottom 2)
          const bottomHalfCount = Math.ceil(totalCount / 2);
          const bottomPlayers = sortedByRating.slice(-bottomHalfCount);

          // Check if one team has almost all bottom players
          const blueBottomPlayers = bottomPlayers.filter(p =>
            blueTeam.some(bp => bp.player_id === p.player_id)
          );
          const orangeBottomPlayers = bottomPlayers.filter(p =>
            orangeTeam.some(op => op.player_id === p.player_id)
          );

          // If one team has ≥80% of bottom half players, it's unfair
          const BOTTOM_CONCENTRATION_THRESHOLD = 0.8;
          if (bottomPlayers.length >= 2 &&
              (blueBottomPlayers.length / bottomPlayers.length >= BOTTOM_CONCENTRATION_THRESHOLD ||
               orangeBottomPlayers.length / bottomPlayers.length >= BOTTOM_CONCENTRATION_THRESHOLD)) {
            return false; // Quality concentration detected
          }

          // Also check if one team has significantly lower average rating within the tier
          const tierAverage = playersInTier.reduce((sum, p) => sum + p.threeLayerRating, 0) / totalCount;

          const blueTierPlayers = playersInTier.filter(p => blueTeam.some(bp => bp.player_id === p.player_id));
          const orangeTierPlayers = playersInTier.filter(p => orangeTeam.some(op => op.player_id === p.player_id));

          if (blueTierPlayers.length > 0 && orangeTierPlayers.length > 0) {
            const blueAvg = blueTierPlayers.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueTierPlayers.length;
            const orangeAvg = orangeTierPlayers.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeTierPlayers.length;

            // If one team's average is significantly below tier average AND the other is above
            const TIER_AVG_GAP_THRESHOLD = 0.3; // 0.3 rating points difference from tier average
            if ((blueAvg < tierAverage - TIER_AVG_GAP_THRESHOLD && orangeAvg > tierAverage + TIER_AVG_GAP_THRESHOLD) ||
                (orangeAvg < tierAverage - TIER_AVG_GAP_THRESHOLD && blueAvg > tierAverage + TIER_AVG_GAP_THRESHOLD)) {
              return false; // Team quality imbalance within tier
            }
          }
        }
      }
    }
  }

  return true; // Distribution is fair
}

/**
 * Get detailed tier distribution validation information
 * Returns information about why distribution might be unfair
 */
function getTierDistributionIssues(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[]): string | null {
  const QUALITY_CONCENTRATION_THRESHOLD = 1.5; // Rating spread threshold for quality checking (relaxed)
  
  const blueTierCounts = new Map<number, number>();
  const orangeTierCounts = new Map<number, number>();
  const totalTierCounts = new Map<number, number>();
  const tierPlayers = new Map<number, PlayerWithRating[]>();

  // Collect all players by tier
  const allPlayers = [...blueTeam, ...orangeTeam];
  allPlayers.forEach(player => {
    const tier = player.tier ?? 1;
    if (!tierPlayers.has(tier)) {
      tierPlayers.set(tier, []);
    }
    tierPlayers.get(tier)!.push(player);
  });

  // Count blue team players by tier
  blueTeam.forEach(player => {
    const tier = player.tier ?? 1;
    blueTierCounts.set(tier, (blueTierCounts.get(tier) || 0) + 1);
    totalTierCounts.set(tier, (totalTierCounts.get(tier) || 0) + 1);
  });

  // Count orange team players by tier
  orangeTeam.forEach(player => {
    const tier = player.tier ?? 1;
    orangeTierCounts.set(tier, (orangeTierCounts.get(tier) || 0) + 1);
    totalTierCounts.set(tier, (totalTierCounts.get(tier) || 0) + 1);
  });

  // Check each tier for concentration violations
  for (const [tier, totalCount] of totalTierCounts) {
    if (totalCount >= 2) {
      const blueCount = blueTierCounts.get(tier) || 0;
      const orangeCount = orangeTierCounts.get(tier) || 0;
      
      // Check if one team has ALL players from this tier
      if (blueCount === totalCount && orangeCount === 0) {
        return `Blue would get ALL ${totalCount} players from Tier ${tier}`;
      }
      if (orangeCount === totalCount && blueCount === 0) {
        return `Orange would get ALL ${totalCount} players from Tier ${tier}`;
      }

      // Check for quality concentration in tiers with 3+ players
      if (totalCount >= 3) {
        const playersInTier = tierPlayers.get(tier) || [];
        const sortedByRating = [...playersInTier].sort((a, b) => b.threeLayerRating - a.threeLayerRating);

        const highestRating = sortedByRating[0].threeLayerRating;
        const lowestRating = sortedByRating[sortedByRating.length - 1].threeLayerRating;
        const ratingSpread = highestRating - lowestRating;

        if (ratingSpread > QUALITY_CONCENTRATION_THRESHOLD) {
          // Identify bottom half of players in tier
          const bottomHalfCount = Math.ceil(totalCount / 2);
          const bottomPlayers = sortedByRating.slice(-bottomHalfCount);

          const blueBottomPlayers = bottomPlayers.filter(p =>
            blueTeam.some(bp => bp.player_id === p.player_id)
          );
          const orangeBottomPlayers = bottomPlayers.filter(p =>
            orangeTeam.some(op => op.player_id === p.player_id)
          );

          // If one team has ≥80% of bottom half players, report it
          const BOTTOM_CONCENTRATION_THRESHOLD = 0.8;
          if (bottomPlayers.length >= 2 && blueBottomPlayers.length / bottomPlayers.length >= BOTTOM_CONCENTRATION_THRESHOLD) {
            const playerNames = blueBottomPlayers.map(p => p.friendly_name).join(', ');
            return `Blue would get ${blueBottomPlayers.length}/${bottomPlayers.length} bottom-half players in Tier ${tier}: ${playerNames}`;
          }
          if (bottomPlayers.length >= 2 && orangeBottomPlayers.length / bottomPlayers.length >= BOTTOM_CONCENTRATION_THRESHOLD) {
            const playerNames = orangeBottomPlayers.map(p => p.friendly_name).join(', ');
            return `Orange would get ${orangeBottomPlayers.length}/${bottomPlayers.length} bottom-half players in Tier ${tier}: ${playerNames}`;
          }

          // Also check for tier average imbalance
          const tierAverage = playersInTier.reduce((sum, p) => sum + p.threeLayerRating, 0) / totalCount;

          const blueTierPlayers = playersInTier.filter(p => blueTeam.some(bp => bp.player_id === p.player_id));
          const orangeTierPlayers = playersInTier.filter(p => orangeTeam.some(op => op.player_id === p.player_id));

          if (blueTierPlayers.length > 0 && orangeTierPlayers.length > 0) {
            const blueAvg = blueTierPlayers.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueTierPlayers.length;
            const orangeAvg = orangeTierPlayers.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeTierPlayers.length;

            const TIER_AVG_GAP_THRESHOLD = 0.3;
            if (blueAvg < tierAverage - TIER_AVG_GAP_THRESHOLD && orangeAvg > tierAverage + TIER_AVG_GAP_THRESHOLD) {
              return `Blue has below-average Tier ${tier} players (avg ${blueAvg.toFixed(2)} vs tier avg ${tierAverage.toFixed(2)})`;
            }
            if (orangeAvg < tierAverage - TIER_AVG_GAP_THRESHOLD && blueAvg > tierAverage + TIER_AVG_GAP_THRESHOLD) {
              return `Orange has below-average Tier ${tier} players (avg ${orangeAvg.toFixed(2)} vs tier avg ${tierAverage.toFixed(2)})`;
            }
          }
        }
      }
    }
  }

  return null; // No issues found
}

/**
 * PHASE 5: Soft Constraint System
 * Interface for penalty scoring instead of hard blocks
 */
interface SwapPenalties {
  eliteShooterPenalty: number;      // Penalty for elite shooter clustering
  shootingMeanPenalty: number;      // Penalty for shooting mean gap
  shooterRatioPenalty: number;      // Penalty for insufficient shooters above median
  tierDistributionPenalty: number;  // Penalty for tier concentration
  chemistryBreakPenalty: number;    // Penalty for breaking high-chemistry pairs (Dec 2025)
  totalPenalty: number;             // Sum of all penalties
  details: string[];                // Explanation of each penalty
}

/**
 * PHASE 5: Calculate soft penalties for constraint violations
 * Returns penalty scores instead of blocking swaps
 */
function calculateSwapPenalties(
  beforeBlueTeam: PlayerWithRating[],
  beforeOrangeTeam: PlayerWithRating[],
  afterBlueTeam: PlayerWithRating[],
  afterOrangeTeam: PlayerWithRating[],
  chemistryLookup?: Map<string, number>
): SwapPenalties {
  const penalties: SwapPenalties = {
    eliteShooterPenalty: 0,
    shootingMeanPenalty: 0,
    shooterRatioPenalty: 0,
    tierDistributionPenalty: 0,
    chemistryBreakPenalty: 0,
    totalPenalty: 0,
    details: []
  };

  // Calculate shooting distribution for all players
  const allPlayers = [...beforeBlueTeam, ...beforeOrangeTeam];
  const shootingDist = analyzeShootingDistribution(allPlayers);
  const shootingStats = calculateShootingStats(allPlayers);

  // 1. Elite Shooter Clustering Penalty
  const beforeBlueElite = beforeBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;
  const beforeOrangeElite = beforeOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;
  const afterBlueElite = afterBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;
  const afterOrangeElite = afterOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;

  const beforeEliteGap = Math.abs(beforeBlueElite - beforeOrangeElite);
  const afterEliteGap = Math.abs(afterBlueElite - afterOrangeElite);

  // Penalty scales quadratically with gap - now triggers at gap >= 1 (was > 1)
  // gap=1 → 3.0, gap=2 → 12.0, gap=3 → 27.0, gap=4 → 48.0
  if (afterEliteGap >= 1) {
    penalties.eliteShooterPenalty = afterEliteGap * afterEliteGap * 3.0;
    penalties.details.push(`Elite shooter gap: ${afterEliteGap} (penalty: ${penalties.eliteShooterPenalty.toFixed(2)})`);
  }

  // 1b. Primary Shooter Clustering Penalty (P75+)
  const beforeBluePrimary = beforeBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p75
  ).length;
  const beforeOrangePrimary = beforeOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p75
  ).length;
  const afterBluePrimary = afterBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p75
  ).length;
  const afterOrangePrimary = afterOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p75
  ).length;

  const beforePrimaryGap = Math.abs(beforeBluePrimary - beforeOrangePrimary);
  const afterPrimaryGap = Math.abs(afterBluePrimary - afterOrangePrimary);

  // Softer penalty for primary shooters: gap=3 → 1.0, gap=4 → 2.0
  if (afterPrimaryGap > 2 && afterPrimaryGap > beforePrimaryGap) {
    const primaryPenalty = (afterPrimaryGap - 2) * 0.5;
    penalties.eliteShooterPenalty += primaryPenalty;
    penalties.details.push(`Primary shooter gap: ${afterPrimaryGap} (penalty: ${primaryPenalty.toFixed(2)})`);
  }

  // 2. Shooting Mean Gap Penalty
  const afterBlueShooting = afterBlueTeam.map(p => p.derived_attributes?.shooting || 0);
  const afterOrangeShooting = afterOrangeTeam.map(p => p.derived_attributes?.shooting || 0);
  const afterBlueMean = afterBlueShooting.reduce((sum, v) => sum + v, 0) / afterBlueTeam.length;
  const afterOrangeMean = afterOrangeShooting.reduce((sum, v) => sum + v, 0) / afterOrangeTeam.length;
  const shootingMeanGap = Math.abs(afterBlueMean - afterOrangeMean);

  if (shootingStats.stdDev > 0.1) {
    const maxAcceptableGap = shootingStats.stdDev * 1.5;
    if (shootingMeanGap > maxAcceptableGap) {
      // Check if this worsens the gap
      const beforeBlueMean = beforeBlueTeam.map(p => p.derived_attributes?.shooting || 0)
        .reduce((sum, v) => sum + v, 0) / beforeBlueTeam.length;
      const beforeOrangeMean = beforeOrangeTeam.map(p => p.derived_attributes?.shooting || 0)
        .reduce((sum, v) => sum + v, 0) / beforeOrangeTeam.length;
      const beforeGap = Math.abs(beforeBlueMean - beforeOrangeMean);

      if (shootingMeanGap > beforeGap) {
        // Penalty proportional to how much it exceeds threshold
        const excessGap = shootingMeanGap - maxAcceptableGap;
        penalties.shootingMeanPenalty = (excessGap / shootingStats.stdDev) * 2.0;
        penalties.details.push(`Shooting mean gap: ${shootingMeanGap.toFixed(2)} > ${maxAcceptableGap.toFixed(2)} (penalty: ${penalties.shootingMeanPenalty.toFixed(2)})`);
      }
    }
  }

  // 3. Shooter Ratio Penalty
  const afterBlueAboveP50 = afterBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
  ).length;
  const afterOrangeAboveP50 = afterOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
  ).length;

  const blueShooterRatio = afterBlueAboveP50 / afterBlueTeam.length;
  const orangeShooterRatio = afterOrangeAboveP50 / afterOrangeTeam.length;
  const minShooterRatio = 0.2;

  if (blueShooterRatio < minShooterRatio || orangeShooterRatio < minShooterRatio) {
    const beforeBlueAboveP50 = beforeBlueTeam.filter(p =>
      (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
    ).length;
    const beforeOrangeAboveP50 = beforeOrangeTeam.filter(p =>
      (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
    ).length;

    const beforeBlueRatio = beforeBlueAboveP50 / beforeBlueTeam.length;
    const beforeOrangeRatio = beforeOrangeAboveP50 / beforeOrangeTeam.length;

    // Only penalize if this makes things worse
    if (blueShooterRatio < beforeBlueRatio || orangeShooterRatio < beforeOrangeRatio) {
      const minRatio = Math.min(blueShooterRatio, orangeShooterRatio);
      const deficit = minShooterRatio - minRatio;
      penalties.shooterRatioPenalty = deficit * 10.0; // Scale up for visibility
      penalties.details.push(`Low shooter ratio: ${(minRatio * 100).toFixed(0)}% < ${(minShooterRatio * 100).toFixed(0)}% (penalty: ${penalties.shooterRatioPenalty.toFixed(2)})`);
    }
  }

  // 4. Tier Distribution Penalty
  const beforeIssues = getTierDistributionIssues(beforeBlueTeam, beforeOrangeTeam);
  const afterIssues = getTierDistributionIssues(afterBlueTeam, afterOrangeTeam);

  // Penalize if swap creates new tier concentration or changes to a different issue
  if (!beforeIssues && afterIssues) {
    penalties.tierDistributionPenalty = 2.0; // Moderate penalty for creating concentration
    penalties.details.push(`Creates tier concentration: ${afterIssues} (penalty: ${penalties.tierDistributionPenalty.toFixed(2)})`);
  } else if (beforeIssues && afterIssues && beforeIssues !== afterIssues) {
    penalties.tierDistributionPenalty = 1.0; // Small penalty for changing issue
    penalties.details.push(`Changes tier issue: ${afterIssues} (penalty: ${penalties.tierDistributionPenalty.toFixed(2)})`);
  }

  // 5. Chemistry Break Penalty (Dec 2025)
  // Penalize swaps that break high-chemistry partnerships
  if (chemistryLookup && chemistryLookup.size > 0) {
    const beforeBlueChemistry = calculateTeamChemistry(beforeBlueTeam, chemistryLookup);
    const beforeOrangeChemistry = calculateTeamChemistry(beforeOrangeTeam, chemistryLookup);
    const afterBlueChemistry = calculateTeamChemistry(afterBlueTeam, chemistryLookup);
    const afterOrangeChemistry = calculateTeamChemistry(afterOrangeTeam, chemistryLookup);

    // Count high-chemistry pairs broken by this swap
    const beforeHighPairs = beforeBlueChemistry.highChemistryPairs + beforeOrangeChemistry.highChemistryPairs;
    const afterHighPairs = afterBlueChemistry.highChemistryPairs + afterOrangeChemistry.highChemistryPairs;

    if (afterHighPairs < beforeHighPairs) {
      const pairsBroken = beforeHighPairs - afterHighPairs;
      // Weight penalty by number of pairs broken (2.0 per pair)
      penalties.chemistryBreakPenalty = pairsBroken * 2.0;
      penalties.details.push(`Breaks ${pairsBroken} high-chemistry pair(s) (penalty: ${penalties.chemistryBreakPenalty.toFixed(2)})`);
    }
  }

  // Calculate total penalty
  penalties.totalPenalty =
    penalties.eliteShooterPenalty +
    penalties.shootingMeanPenalty +
    penalties.shooterRatioPenalty +
    penalties.tierDistributionPenalty +
    penalties.chemistryBreakPenalty;

  return penalties;
}

/**
 * PHASE 5: Improved validation that now uses soft penalties
 * Only blocks truly catastrophic cases (elite gap > 4)
 * Returns object with acceptance status and rejection reason if applicable
 */
function isSwapAcceptable(
  beforeBlueTeam: PlayerWithRating[],
  beforeOrangeTeam: PlayerWithRating[],
  afterBlueTeam: PlayerWithRating[],
  afterOrangeTeam: PlayerWithRating[],
  balanceImprovement?: number
): { acceptable: boolean; rejectReason?: string } {
  // PHASE 5: Simplified - only block truly catastrophic cases
  // Most violations are now handled by soft penalties in the evaluation phase

  // Calculate shooting distribution for all players
  const allPlayers = [...beforeBlueTeam, ...beforeOrangeTeam];
  const shootingDist = analyzeShootingDistribution(allPlayers);

  // HARD CONSTRAINT: Block elite shooter clustering (gap > 2)
  const beforeBlueElite = beforeBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;
  const beforeOrangeElite = beforeOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;

  const afterBlueElite = afterBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;
  const afterOrangeElite = afterOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90
  ).length;

  const beforeEliteGap = Math.abs(beforeBlueElite - beforeOrangeElite);
  const afterEliteGap = Math.abs(afterBlueElite - afterOrangeElite);

  // VETO if elite gap exceeds 2 AND worsens the gap
  if (afterEliteGap > 2 && afterEliteGap >= beforeEliteGap) {
    return { acceptable: false, rejectReason: `Elite shooter gap too large: ${afterEliteGap} (max 2)` };
  }

  // HARD CONSTRAINT: Position Balance
  // Prevent tactical imbalances (e.g., 4 strikers on one team, 1 on the other)
  const positionImpact = evaluateSwapPositionImpact(
    beforeBlueTeam,
    beforeOrangeTeam,
    afterBlueTeam,
    afterOrangeTeam
  );

  if (!positionImpact.acceptable) {
    return {
      acceptable: false,
      rejectReason: `POSITION BALANCE: ${positionImpact.rejectReason}`
    };
  }

  // HARD CONSTRAINT: Extreme Tier Concentration
  // Prevent swaps that would give one team ALL players from any tier with 2+ players
  const afterTierIssues = getTierDistributionIssues(afterBlueTeam, afterOrangeTeam);
  if (afterTierIssues && afterTierIssues.includes('ALL')) {
    // Only hard reject if this is CREATING the extreme concentration
    const beforeTierIssues = getTierDistributionIssues(beforeBlueTeam, beforeOrangeTeam);
    if (!beforeTierIssues || !beforeTierIssues.includes('ALL')) {
      return {
        acceptable: false,
        rejectReason: `TIER CONCENTRATION: Would create extreme tier concentration (${afterTierIssues})`
      };
    }
  }

  // All other constraints are now soft penalties
  // Allow the swap and let the evaluation phase decide based on net improvement
  return { acceptable: true };
}

/**
 * Generate comprehensive swap analysis showing all metrics and specific rejection reasons
 */
function generateComprehensiveSwapAnalysis(
  bluePlayer: PlayerWithRating,
  orangePlayer: PlayerWithRating,
  beforeDetails: BalanceScoreDetails,
  afterDetails: BalanceScoreDetails,
  improvement: number,
  attributeBalance: number,
  attributeThreshold: number,
  isSwapOk: boolean,
  tierIssue: string | null,
  swapRejectReason?: string,
  attributeThresholdReason?: string
): string {
  let analysis = '';

  // Show improvement status
  if (improvement > 0) {
    analysis += ` (improves by ${improvement.toFixed(3)})`;
  } else if (improvement < 0) {
    analysis += ` (worsens by ${Math.abs(improvement).toFixed(3)})`;
  } else {
    analysis += ` (no change)`;
  }

  // Show skill changes
  const skillChanges: string[] = [];
  if (Math.abs(beforeDetails.attackDiff - afterDetails.attackDiff) > 0.01) {
    skillChanges.push(`Attack: ${beforeDetails.attackDiff.toFixed(2)}→${afterDetails.attackDiff.toFixed(2)}`);
  }
  if (Math.abs(beforeDetails.defenseDiff - afterDetails.defenseDiff) > 0.01) {
    skillChanges.push(`Defense: ${beforeDetails.defenseDiff.toFixed(2)}→${afterDetails.defenseDiff.toFixed(2)}`);
  }
  if (Math.abs(beforeDetails.gameIqDiff - afterDetails.gameIqDiff) > 0.01) {
    skillChanges.push(`GameIQ: ${beforeDetails.gameIqDiff.toFixed(2)}→${afterDetails.gameIqDiff.toFixed(2)}`);
  }

  if (skillChanges.length > 0) {
    analysis += `\n      Skills: ${skillChanges.join(', ')}`;
  }

  // Show attribute changes if available
  if (afterDetails.hasAttributes && beforeDetails.paceDiff !== undefined) {
    const attrChanges: string[] = [];
    const threshold = 0.1;

    // Identify problematic attributes (>1.0 difference)
    const problematicAttrs: string[] = [];

    if (afterDetails.paceDiff && afterDetails.paceDiff > 1.0) problematicAttrs.push(`Pace(${afterDetails.paceDiff.toFixed(2)})`);
    if (afterDetails.shootingDiff && afterDetails.shootingDiff > 1.0) problematicAttrs.push(`Shooting(${afterDetails.shootingDiff.toFixed(2)})`);
    if (afterDetails.passingDiff && afterDetails.passingDiff > 1.0) problematicAttrs.push(`Passing(${afterDetails.passingDiff.toFixed(2)})`);
    if (afterDetails.dribblingDiff && afterDetails.dribblingDiff > 1.0) problematicAttrs.push(`Dribbling(${afterDetails.dribblingDiff.toFixed(2)})`);
    if (afterDetails.defendingDiff && afterDetails.defendingDiff > 1.0) problematicAttrs.push(`Defending(${afterDetails.defendingDiff.toFixed(2)})`);
    if (afterDetails.physicalDiff && afterDetails.physicalDiff > 1.0) problematicAttrs.push(`Physical(${afterDetails.physicalDiff.toFixed(2)})`);

    if (problematicAttrs.length > 0) {
      analysis += `\n      HIGH IMBALANCE: ${problematicAttrs.join(', ')}`;
    }

    // Show all attribute changes - use lower threshold for accepted swaps
    const attrThreshold = isSwapOk ? 0.05 : threshold;

    if (Math.abs((beforeDetails.paceDiff ?? 0) - (afterDetails.paceDiff ?? 0)) > attrThreshold) {
      attrChanges.push(`Pace: ${(beforeDetails.paceDiff ?? 0).toFixed(2)}→${(afterDetails.paceDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs((beforeDetails.shootingDiff ?? 0) - (afterDetails.shootingDiff ?? 0)) > attrThreshold) {
      attrChanges.push(`Shoot: ${(beforeDetails.shootingDiff ?? 0).toFixed(2)}→${(afterDetails.shootingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs((beforeDetails.passingDiff ?? 0) - (afterDetails.passingDiff ?? 0)) > attrThreshold) {
      attrChanges.push(`Pass: ${(beforeDetails.passingDiff ?? 0).toFixed(2)}→${(afterDetails.passingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs((beforeDetails.dribblingDiff ?? 0) - (afterDetails.dribblingDiff ?? 0)) > attrThreshold) {
      attrChanges.push(`Drib: ${(beforeDetails.dribblingDiff ?? 0).toFixed(2)}→${(afterDetails.dribblingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs((beforeDetails.defendingDiff ?? 0) - (afterDetails.defendingDiff ?? 0)) > attrThreshold) {
      attrChanges.push(`Def: ${(beforeDetails.defendingDiff ?? 0).toFixed(2)}→${(afterDetails.defendingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs((beforeDetails.physicalDiff ?? 0) - (afterDetails.physicalDiff ?? 0)) > attrThreshold) {
      attrChanges.push(`Phys: ${(beforeDetails.physicalDiff ?? 0).toFixed(2)}→${(afterDetails.physicalDiff ?? 0).toFixed(2)}`);
    }

    // Always show attributes for accepted swaps or if there are changes
    if (attrChanges.length > 0 || (isSwapOk && improvement > 0)) {
      if (attrChanges.length === 0) {
        // Show current state if no significant changes
        analysis += `\n      Attributes: balanced (no significant changes)`;
      } else {
        analysis += `\n      Attributes: ${attrChanges.join(', ')}`;
      }
    }
  }

  // Show win rate and goal diff if significant
  const blueWinRate = beforeDetails.blueWinRate ?? 0;
  const orangeWinRate = beforeDetails.orangeWinRate ?? 0;
  const afterBlueWR = afterDetails.blueWinRate ?? 0;
  const afterOrangeWR = afterDetails.orangeWinRate ?? 0;

  if (Math.abs((blueWinRate - orangeWinRate) - (afterBlueWR - afterOrangeWR)) > 1) {
    const wrBefore = Math.abs(blueWinRate - orangeWinRate).toFixed(1);
    const wrAfter = Math.abs(afterBlueWR - afterOrangeWR).toFixed(1);
    analysis += `\n      Win Rate Gap: ${wrBefore}%→${wrAfter}%`;
  }

  // Add rejection reason with specific constraint identification
  if (!isSwapOk) {
    analysis += `\n      → REJECTED: `;
    const rejectionReasons: string[] = [];

    // Check for rejection reasons in priority order
    // 1. First check if swap was rejected by isSwapAcceptable()
    if (swapRejectReason) {
      rejectionReasons.push(swapRejectReason);
    }

    // 2. Check if swap was rejected by attribute threshold
    if (attributeThresholdReason) {
      rejectionReasons.push(attributeThresholdReason);
    }

    // 3. Check for other common rejection reasons (for legacy/fallback)
    if (!swapRejectReason && !attributeThresholdReason) {
      if (attributeBalance > attributeThreshold) {
        rejectionReasons.push(`Attribute constraint (${attributeBalance.toFixed(2)} > ${attributeThreshold.toFixed(2)})`);
      }
      if (tierIssue) {
        rejectionReasons.push(`Tier distribution (${tierIssue})`);
      }
      if (improvement < 0.05) {
        rejectionReasons.push(`Minimal improvement (${improvement.toFixed(3)} < 0.05)`);
      }
    }

    // Calculate weighted decision score for transparency
    const skillImprovement = (beforeDetails.skillBalance ?? 0) - (afterDetails.skillBalance ?? 0);
    const weightedScore = (skillImprovement * 0.65) - (attributeBalance * 0.15);

    if (rejectionReasons.length > 0) {
      analysis += rejectionReasons.join(', ');
      analysis += ` [weighted score: ${weightedScore.toFixed(3)}]`;
    } else {
      analysis += `Unknown reason (this should not happen - please report this bug)`;
    }
  } else if (improvement > 0) {
    analysis += `\n      → ACCEPTED`;
    const skillImprovement = (beforeDetails.skillBalance ?? 0) - (afterDetails.skillBalance ?? 0);
    const weightedScore = (skillImprovement * 0.65) - (attributeBalance * 0.15);
    analysis += ` [weighted score: ${weightedScore.toFixed(3)}]`;
  }

  return analysis;
}

/**
 * Generate detailed improvement message showing specific skills and attributes
 */
function generateImprovementDetails(
  beforeDetails: BalanceScoreDetails,
  afterDetails: BalanceScoreDetails
): string {
  const improvements: string[] = [];
  const threshold = 0.01; // Only show changes above this threshold
  
  // Check skill improvements
  const attackImprove = beforeDetails.attackDiff - afterDetails.attackDiff;
  const defenseImprove = beforeDetails.defenseDiff - afterDetails.defenseDiff;
  const gameIqImprove = beforeDetails.gameIqDiff - afterDetails.gameIqDiff;
  
  if (Math.abs(attackImprove) > threshold) {
    improvements.push(`Atk:${beforeDetails.attackDiff.toFixed(2)}→${afterDetails.attackDiff.toFixed(2)}`);
  }
  if (Math.abs(defenseImprove) > threshold) {
    improvements.push(`Def:${beforeDetails.defenseDiff.toFixed(2)}→${afterDetails.defenseDiff.toFixed(2)}`);
  }
  if (Math.abs(gameIqImprove) > threshold) {
    improvements.push(`IQ:${beforeDetails.gameIqDiff.toFixed(2)}→${afterDetails.gameIqDiff.toFixed(2)}`);
  }
  
  // Check attribute improvements (if available)
  if (afterDetails.hasAttributes && beforeDetails.paceDiff !== undefined) {
    const paceImprove = (beforeDetails.paceDiff ?? 0) - (afterDetails.paceDiff ?? 0);
    const shootImprove = (beforeDetails.shootingDiff ?? 0) - (afterDetails.shootingDiff ?? 0);
    const passImprove = (beforeDetails.passingDiff ?? 0) - (afterDetails.passingDiff ?? 0);
    const dribbleImprove = (beforeDetails.dribblingDiff ?? 0) - (afterDetails.dribblingDiff ?? 0);
    const defendImprove = (beforeDetails.defendingDiff ?? 0) - (afterDetails.defendingDiff ?? 0);
    const physImprove = (beforeDetails.physicalDiff ?? 0) - (afterDetails.physicalDiff ?? 0);
    
    if (Math.abs(paceImprove) > threshold * 10) {
      improvements.push(`Pace:${(beforeDetails.paceDiff ?? 0).toFixed(2)}→${(afterDetails.paceDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs(shootImprove) > threshold * 10) {
      improvements.push(`Shoot:${(beforeDetails.shootingDiff ?? 0).toFixed(2)}→${(afterDetails.shootingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs(passImprove) > threshold * 10) {
      improvements.push(`Pass:${(beforeDetails.passingDiff ?? 0).toFixed(2)}→${(afterDetails.passingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs(dribbleImprove) > threshold * 10) {
      improvements.push(`Drib:${(beforeDetails.dribblingDiff ?? 0).toFixed(2)}→${(afterDetails.dribblingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs(defendImprove) > threshold * 10) {
      improvements.push(`DefAttr:${(beforeDetails.defendingDiff ?? 0).toFixed(2)}→${(afterDetails.defendingDiff ?? 0).toFixed(2)}`);
    }
    if (Math.abs(physImprove) > threshold * 10) {
      improvements.push(`Phys:${(beforeDetails.physicalDiff ?? 0).toFixed(2)}→${(afterDetails.physicalDiff ?? 0).toFixed(2)}`);
    }
  }
  
  return improvements.length > 0 ? ` [${improvements.join(', ')}]` : '';
}

/**
 * Try same-tier swaps within a specific tier
 * NOW WITH SIMULATED ANNEALING: Can accept worse swaps based on temperature
 */
function trySameTierSwaps(
  tier: number,
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  blueTierPlayers: PlayerWithRating[],
  orangeTierPlayers: PlayerWithRating[],
  currentBalance: number,
  permanentGKIds: string[] = [],
  failedAttempts: number = 0,
  temperature: number = 0.0, // NEW: Temperature for simulated annealing
  debugLog?: { value: string }
): {
  bestSwap: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating } | null;
  bestScore: number;
  improved: boolean;
  acceptedWorsening: boolean; // NEW: Track if we accepted a worse swap
} {
  if (blueTierPlayers.length === 0 || orangeTierPlayers.length === 0) {
    return { bestSwap: null, bestScore: currentBalance, improved: false, acceptedWorsening: false };
  }

  if (debugLog) {
    debugLog.value += `  Same-tier swaps in Tier ${tier}:\n`;
    debugLog.value += `    Blue: ${blueTierPlayers.map(p => `${p.friendly_name}(${p.threeLayerRating.toFixed(2)})`).join(', ')}\n`;
    debugLog.value += `    Orange: ${orangeTierPlayers.map(p => `${p.friendly_name}(${p.threeLayerRating.toFixed(2)})`).join(', ')}\n`;

    // Add tier distribution status for this tier
    const currentDistributionIssue = getTierDistributionIssues(blueTeam, orangeTeam);
    if (currentDistributionIssue) {
      debugLog.value += `    Current distribution issue: ${currentDistributionIssue}\n`;
    }
  }

  let bestSwap: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating } | null = null;
  let bestScore = currentBalance;
  let improved = false;
  let acceptedWorsening = false; // Track if we accepted a worse swap via SA

  // Try all possible swaps within this tier
  for (const bluePlayer of blueTierPlayers) {
    for (const orangePlayer of orangeTierPlayers) {
      // Skip if either player is a permanent GK
      if (bluePlayer.isPermanentGK || orangePlayer.isPermanentGK) {
        continue;
      }

      // Create temporary teams with this swap
      const tempBlue = [...blueTeam];
      const tempOrange = [...orangeTeam];

      const blueIndex = tempBlue.findIndex(p => p.player_id === bluePlayer.player_id);
      const orangeIndex = tempOrange.findIndex(p => p.player_id === orangePlayer.player_id);

      if (blueIndex === -1 || orangeIndex === -1) continue;
      
      tempBlue[blueIndex] = orangePlayer;
      tempOrange[orangeIndex] = bluePlayer;

      const newBalance = calculateTierBalanceScore(tempBlue, tempOrange, permanentGKIds);
      const improvement = currentBalance - newBalance;
      
      // Calculate attribute balance for this swap
      const attributeBalance = calculateAttributeBalanceScore(tempBlue, tempOrange);

      // Calculate win rate gaps for threshold adjustment
      const blueWinRateBefore = blueTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / blueTeam.length;
      const orangeWinRateBefore = orangeTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / orangeTeam.length;
      const winRateGapBefore = Math.abs(blueWinRateBefore - orangeWinRateBefore);

      const blueWinRateAfter = tempBlue.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempBlue.length;
      const orangeWinRateAfter = tempOrange.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempOrange.length;
      const winRateGapAfter = Math.abs(blueWinRateAfter - orangeWinRateAfter);

      // Check if this swap is acceptable (doesn't worsen existing concentrations)
      const swapValidation = isSwapAcceptable(blueTeam, orangeTeam, tempBlue, tempOrange, improvement);
      let isSwapOk = swapValidation.acceptable;
      const swapRejectReason = swapValidation.rejectReason;

      // SOFT PENALTY SYSTEM: Instead of hard rejections, apply graduated penalties
      // Only hard reject for truly catastrophic violations
      const attributeThreshold = getAttributeBalanceThreshold(
        improvement,
        currentBalance,
        failedAttempts,
        winRateGapBefore,
        winRateGapAfter
      );

      // Calculate soft penalty for attribute threshold violations
      const softPenalty = calculateSoftPenalty(attributeBalance, attributeThreshold, 'same-tier swap');
      let attributeThresholdReason: string | undefined;
      let swapPenalty = 0;

      if (softPenalty.rejected) {
        // Only hard reject for truly catastrophic violations (>2.5x threshold)
        isSwapOk = false;
        attributeThresholdReason = softPenalty.reason;
      } else if (softPenalty.penalty > 0) {
        // Apply soft penalty - swap can still be accepted but with reduced score
        swapPenalty = softPenalty.penalty;
        attributeThresholdReason = `⚠️ SOFT PENALTY: ${softPenalty.reason}`;
      }

      if (debugLog) {
        debugLog.value += `    Trying ${bluePlayer.friendly_name} ↔ ${orangePlayer.friendly_name}: `;
        debugLog.value += `balance ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`;

        // Always calculate detailed metrics for comprehensive analysis
        const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);
        const afterDetails = calculateDetailedBalanceScore(tempBlue, tempOrange, permanentGKIds);
        const issue = getTierDistributionIssues(tempBlue, tempOrange);

        // Generate comprehensive analysis
        const swapAnalysis = generateComprehensiveSwapAnalysis(
          bluePlayer,
          orangePlayer,
          beforeDetails,
          afterDetails,
          improvement,
          attributeBalance,
          attributeThreshold,
          isSwapOk,
          issue,
          swapRejectReason,
          attributeThresholdReason
        );

        debugLog.value += swapAnalysis;
        debugLog.value += `\n`;
      }
      
      // Use multi-objective evaluation instead of simple balance comparison
      if (isSwapOk) {
        const multiScoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKIds);
        const multiScoreAfter = calculateMultiObjectiveScore(tempBlue, tempOrange, permanentGKIds);
        const evaluation = evaluateSwap(multiScoreBefore, multiScoreAfter, blueTeam, orangeTeam, tempBlue, tempOrange);

        if (evaluation.isImprovement) {
          // Accept improving swaps immediately
          bestScore = newBalance;
          bestSwap = { bluePlayer, orangePlayer };
          improved = true;

          // Store multi-objective details for debug logging
          if (debugLog) {
            debugLog.value += `      ✅ Multi-objective: improved [${evaluation.improvedObjectives.join(', ')}]`;
            if (evaluation.worsenedObjectives.length > 0) {
              debugLog.value += `, worsened [${evaluation.worsenedObjectives.join(', ')}]`;
            }
            debugLog.value += `\n`;
          }
        } else if (temperature > 0) {
          // SIMULATED ANNEALING: Accept worse swaps probabilistically
          // Higher temperature = more likely to accept worse moves
          // Smaller worsening = more likely to accept

          const balanceWorsening = newBalance - currentBalance; // Positive = worse

          // Only consider if worsening is not catastrophic (< 0.2 balance score worsening)
          if (balanceWorsening < 0.2) {
            // Calculate acceptance probability: exp(-ΔE / T)
            // ΔE = energy increase (balance worsening)
            // T = temperature (higher temp = more exploration)
            const acceptanceProbability = Math.exp(-balanceWorsening / temperature);
            const randomValue = Math.random();

            if (randomValue < acceptanceProbability) {
              // Accept this worse swap!
              bestScore = newBalance;
              bestSwap = { bluePlayer, orangePlayer };
              improved = false; // Not an improvement, but accepted
              acceptedWorsening = true;

              if (debugLog) {
                debugLog.value += `      🎲 SA ACCEPTED: Worse swap accepted via simulated annealing\n`;
                debugLog.value += `         ΔBalance: +${balanceWorsening.toFixed(3)} (worsening)\n`;
                debugLog.value += `         Acceptance prob: ${(acceptanceProbability * 100).toFixed(1)}%\n`;
                debugLog.value += `         Random value: ${randomValue.toFixed(3)}\n`;
                debugLog.value += `         Temperature: ${temperature.toFixed(2)}\n`;
                if (evaluation.worsenedObjectives.length > 0) {
                  debugLog.value += `         Worsened: [${evaluation.worsenedObjectives.join(', ')}]\n`;
                }
                if (evaluation.improvedObjectives.length > 0) {
                  debugLog.value += `         Improved: [${evaluation.improvedObjectives.join(', ')}]\n`;
                }
              }
            } else if (debugLog && balanceWorsening < 0.05) {
              // Log near-misses for analysis
              debugLog.value += `      🎲 SA REJECTED: ${(acceptanceProbability * 100).toFixed(1)}% chance (rolled ${randomValue.toFixed(3)})\n`;
            }
          }
        }
      }
    }
  }

  if (debugLog) {
    if ((improved || acceptedWorsening) && bestSwap) {
      debugLog.value += `    Best same-tier swap: ${bestSwap.bluePlayer.friendly_name} ↔ ${bestSwap.orangePlayer.friendly_name}\n`;

      if (acceptedWorsening) {
        debugLog.value += `    🎲 ACCEPTED VIA SA: Balance worsened by ${(bestScore - currentBalance).toFixed(3)} (${currentBalance.toFixed(3)} → ${bestScore.toFixed(3)})\n`;
      } else {
        debugLog.value += `    Improvement: ${(currentBalance - bestScore).toFixed(3)} (${bestScore.toFixed(3)})\n`;
      }

      // Add detailed explanation of what improved/changed
      const tempBlue = [...blueTeam];
      const tempOrange = [...orangeTeam];
      const blueIdx = tempBlue.findIndex(p => p.player_id === bestSwap.bluePlayer.player_id);
      const orangeIdx = tempOrange.findIndex(p => p.player_id === bestSwap.orangePlayer.player_id);
      if (blueIdx >= 0 && orangeIdx >= 0) {
        tempBlue[blueIdx] = bestSwap.orangePlayer;
        tempOrange[orangeIdx] = bestSwap.bluePlayer;

        const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);
        const afterDetails = calculateDetailedBalanceScore(tempBlue, tempOrange, permanentGKIds);

        const detailedImprovements = generateImprovementDetails(beforeDetails, afterDetails);

        debugLog.value += `    Reason: `;
        if (detailedImprovements) {
          // Remove the brackets and display as reason
          debugLog.value += detailedImprovements.replace(/^\s*\[/, '').replace(/\]\s*$/, '');
        } else {
          debugLog.value += acceptedWorsening ? 'Exploring alternative configuration (SA)' : 'Overall balance improvement';
        }
        debugLog.value += `\n`;
      }
    } else {
      debugLog.value += `    No beneficial same-tier swaps found${temperature > 0 ? ' (even with SA)' : ''}\n`;
    }
  }

  return { bestSwap, bestScore, improved, acceptedWorsening };
}

/**
 * Try cross-tier swaps between two adjacent tiers
 * NOW WITH SIMULATED ANNEALING: Can accept worse swaps based on temperature
 */
function tryCrossTierSwaps(
  lowerTier: number,
  upperTier: number,
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  blueLowerPlayers: PlayerWithRating[],
  orangeLowerPlayers: PlayerWithRating[],
  blueUpperPlayers: PlayerWithRating[],
  orangeUpperPlayers: PlayerWithRating[],
  currentBalance: number,
  permanentGKIds: string[] = [],
  failedAttempts: number = 0,
  temperature: number = 0.0, // NEW: Temperature for simulated annealing
  debugLog?: { value: string }
): {
  bestSwap: {
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    blueTier: number;
    orangeTier: number;
  } | null;
  bestScore: number;
  improved: boolean;
  acceptedWorsening: boolean; // NEW: Track if we accepted a worse swap
} {
  // Soft tier boundaries: Allow more flexible rating differences for players at tier edges
  const SOFT_BOUNDARY_THRESHOLD = 0.2; // Players within 0.2 rating of tier boundary
  const MAX_RATING_DIFFERENCE_SOFT = 2.0; // More lenient for edge players
  const MAX_RATING_DIFFERENCE_NORMAL = 1.5; // Standard restriction

  // Helper to check if players are at tier edges (for soft boundaries)
  const isAtTierEdge = (player: PlayerWithRating, tierPlayers: PlayerWithRating[]): boolean => {
    if (tierPlayers.length === 0) return false;
    const ratings = tierPlayers.map(p => p.threeLayerRating).sort((a, b) => a - b);
    const minRating = ratings[0];
    const maxRating = ratings[ratings.length - 1];
    const playerRating = player.threeLayerRating;
    return Math.abs(playerRating - minRating) <= SOFT_BOUNDARY_THRESHOLD ||
           Math.abs(playerRating - maxRating) <= SOFT_BOUNDARY_THRESHOLD;
  };

  if (debugLog && (blueLowerPlayers.length > 0 || orangeLowerPlayers.length > 0) && 
     (blueUpperPlayers.length > 0 || orangeUpperPlayers.length > 0)) {
    debugLog.value += `  Cross-tier swaps Tier ${lowerTier}↔${upperTier}:\n`;
    debugLog.value += `    Tier ${lowerTier} - Blue: ${blueLowerPlayers.map(p => `${p.friendly_name}(${p.threeLayerRating.toFixed(2)})`).join(', ')}\n`;
    debugLog.value += `    Tier ${lowerTier} - Orange: ${orangeLowerPlayers.map(p => `${p.friendly_name}(${p.threeLayerRating.toFixed(2)})`).join(', ')}\n`;
    debugLog.value += `    Tier ${upperTier} - Blue: ${blueUpperPlayers.map(p => `${p.friendly_name}(${p.threeLayerRating.toFixed(2)})`).join(', ')}\n`;
    debugLog.value += `    Tier ${upperTier} - Orange: ${orangeUpperPlayers.map(p => `${p.friendly_name}(${p.threeLayerRating.toFixed(2)})`).join(', ')}\n`;
  }

  let bestSwap: {
    bluePlayer: PlayerWithRating;
    orangePlayer: PlayerWithRating;
    blueTier: number;
    orangeTier: number;
  } | null = null;
  let bestScore = currentBalance;
  let improved = false;
  let acceptedWorsening = false; // Track if we accepted a worse swap via SA

  // Try Blue lower tier ↔ Orange upper tier
  for (const blueLower of blueLowerPlayers) {
    for (const orangeUpper of orangeUpperPlayers) {
      // Skip if either player is a permanent GK
      if (blueLower.isPermanentGK || orangeUpper.isPermanentGK) {
        continue;
      }

      const ratingDiff = Math.abs(blueLower.threeLayerRating - orangeUpper.threeLayerRating);

      // Use soft boundary if either player is at their tier edge
      const blueAtEdge = isAtTierEdge(blueLower, blueLowerPlayers);
      const orangeAtEdge = isAtTierEdge(orangeUpper, orangeUpperPlayers);
      const maxDiff = (blueAtEdge || orangeAtEdge) ? MAX_RATING_DIFFERENCE_SOFT : MAX_RATING_DIFFERENCE_NORMAL;

      if (ratingDiff > maxDiff) continue;
      
      // Create temporary teams with this cross-tier swap
      const tempBlue = [...blueTeam];
      const tempOrange = [...orangeTeam];
      
      const blueIndex = tempBlue.findIndex(p => p.player_id === blueLower.player_id);
      const orangeIndex = tempOrange.findIndex(p => p.player_id === orangeUpper.player_id);
      
      if (blueIndex === -1 || orangeIndex === -1) continue;
      
      tempBlue[blueIndex] = orangeUpper;
      tempOrange[orangeIndex] = blueLower;

      const newBalance = calculateTierBalanceScore(tempBlue, tempOrange, permanentGKIds);
      const improvement = currentBalance - newBalance;
      
      // Calculate attribute balance for this swap
      const attributeBalance = calculateAttributeBalanceScore(tempBlue, tempOrange);

      // Calculate win rate gaps for threshold adjustment
      const blueWinRateBefore = blueTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / blueTeam.length;
      const orangeWinRateBefore = orangeTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / orangeTeam.length;
      const winRateGapBefore = Math.abs(blueWinRateBefore - orangeWinRateBefore);

      const blueWinRateAfter = tempBlue.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempBlue.length;
      const orangeWinRateAfter = tempOrange.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempOrange.length;
      const winRateGapAfter = Math.abs(blueWinRateAfter - orangeWinRateAfter);

      // Check if this swap is acceptable (doesn't worsen existing concentrations)
      const swapValidation = isSwapAcceptable(blueTeam, orangeTeam, tempBlue, tempOrange, improvement);
      let isSwapOk = swapValidation.acceptable;
      const swapRejectReason = swapValidation.rejectReason;

      // SOFT PENALTY SYSTEM for cross-tier (Blue lower ↔ Orange upper)
      const attributeThreshold = getAttributeBalanceThreshold(
        improvement,
        currentBalance,
        failedAttempts,
        winRateGapBefore,
        winRateGapAfter
      );

      const softPenalty = calculateSoftPenalty(attributeBalance, attributeThreshold, 'cross-tier swap');
      let attributeThresholdReason: string | undefined;
      let swapPenalty = 0;

      if (softPenalty.rejected) {
        isSwapOk = false;
        attributeThresholdReason = softPenalty.reason;
      } else if (softPenalty.penalty > 0) {
        swapPenalty = softPenalty.penalty;
        attributeThresholdReason = `⚠️ SOFT PENALTY: ${softPenalty.reason}`;
      }

      if (debugLog) {
        debugLog.value += `    Trying ${blueLower.friendly_name}(T${lowerTier}) ↔ ${orangeUpper.friendly_name}(T${upperTier}): `;
        debugLog.value += `balance ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`;

        // Always calculate detailed metrics for comprehensive analysis
        const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);
        const afterDetails = calculateDetailedBalanceScore(tempBlue, tempOrange, permanentGKIds);
        const issue = getTierDistributionIssues(tempBlue, tempOrange);

        // Generate comprehensive analysis
        const swapAnalysis = generateComprehensiveSwapAnalysis(
          blueLower,
          orangeUpper,
          beforeDetails,
          afterDetails,
          improvement,
          attributeBalance,
          attributeThreshold,
          isSwapOk,
          issue,
          swapRejectReason,
          attributeThresholdReason
        );

        debugLog.value += swapAnalysis;
        debugLog.value += `\n`;
      }

      // Use multi-objective evaluation instead of simple balance comparison
      if (isSwapOk) {
        const multiScoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKIds);
        const multiScoreAfter = calculateMultiObjectiveScore(tempBlue, tempOrange, permanentGKIds);
        const evaluation = evaluateSwap(multiScoreBefore, multiScoreAfter, blueTeam, orangeTeam, tempBlue, tempOrange);

        if (evaluation.isImprovement) {
          // Accept improving swaps immediately
          bestScore = newBalance;
          bestSwap = {
            bluePlayer: blueLower,
            orangePlayer: orangeUpper,
            blueTier: lowerTier,
            orangeTier: upperTier
          };
          improved = true;

          // Store multi-objective details for debug logging
          if (debugLog) {
            debugLog.value += `      ✅ Multi-objective: improved [${evaluation.improvedObjectives.join(', ')}]`;
            if (evaluation.worsenedObjectives.length > 0) {
              debugLog.value += `, worsened [${evaluation.worsenedObjectives.join(', ')}]`;
            }
            debugLog.value += `\n`;
          }
        } else if (temperature > 0) {
          // SIMULATED ANNEALING: Accept worse swaps probabilistically
          const balanceWorsening = newBalance - currentBalance; // Positive = worse

          // Only consider if worsening is not catastrophic (< 0.2 balance score worsening)
          if (balanceWorsening < 0.2) {
            const acceptanceProbability = Math.exp(-balanceWorsening / temperature);
            const randomValue = Math.random();

            if (randomValue < acceptanceProbability) {
              // Accept this worse swap!
              bestScore = newBalance;
              bestSwap = {
                bluePlayer: blueLower,
                orangePlayer: orangeUpper,
                blueTier: lowerTier,
                orangeTier: upperTier
              };
              improved = false;
              acceptedWorsening = true;

              if (debugLog) {
                debugLog.value += `      🎲 SA ACCEPTED: Cross-tier worse swap accepted\n`;
                debugLog.value += `         ΔBalance: +${balanceWorsening.toFixed(3)}, prob: ${(acceptanceProbability * 100).toFixed(1)}%, T: ${temperature.toFixed(2)}\n`;
              }
            } else if (debugLog && balanceWorsening < 0.05) {
              debugLog.value += `      🎲 SA REJECTED: ${(acceptanceProbability * 100).toFixed(1)}% chance\n`;
            }
          }
        }
      }
    }
  }

  // Try Orange lower tier ↔ Blue upper tier
  for (const orangeLower of orangeLowerPlayers) {
    for (const blueUpper of blueUpperPlayers) {
      // Skip if either player is a permanent GK
      if (orangeLower.isPermanentGK || blueUpper.isPermanentGK) {
        continue;
      }

      const ratingDiff = Math.abs(orangeLower.threeLayerRating - blueUpper.threeLayerRating);

      // Use soft boundary if either player is at their tier edge
      const orangeAtEdge = isAtTierEdge(orangeLower, orangeLowerPlayers);
      const blueAtEdge = isAtTierEdge(blueUpper, blueUpperPlayers);
      const maxDiff = (orangeAtEdge || blueAtEdge) ? MAX_RATING_DIFFERENCE_SOFT : MAX_RATING_DIFFERENCE_NORMAL;

      if (ratingDiff > maxDiff) continue;
      
      // Create temporary teams with this cross-tier swap
      const tempBlue = [...blueTeam];
      const tempOrange = [...orangeTeam];
      
      const blueIndex = tempBlue.findIndex(p => p.player_id === blueUpper.player_id);
      const orangeIndex = tempOrange.findIndex(p => p.player_id === orangeLower.player_id);
      
      if (blueIndex === -1 || orangeIndex === -1) continue;
      
      tempBlue[blueIndex] = orangeLower;
      tempOrange[orangeIndex] = blueUpper;

      const newBalance = calculateTierBalanceScore(tempBlue, tempOrange, permanentGKIds);
      const improvement = currentBalance - newBalance;
      
      // Calculate attribute balance for this swap
      const attributeBalance = calculateAttributeBalanceScore(tempBlue, tempOrange);

      // Calculate win rate gaps for threshold adjustment
      const blueWinRateBefore = blueTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / blueTeam.length;
      const orangeWinRateBefore = orangeTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / orangeTeam.length;
      const winRateGapBefore = Math.abs(blueWinRateBefore - orangeWinRateBefore);

      const blueWinRateAfter = tempBlue.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempBlue.length;
      const orangeWinRateAfter = tempOrange.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempOrange.length;
      const winRateGapAfter = Math.abs(blueWinRateAfter - orangeWinRateAfter);

      // Check if this swap is acceptable (doesn't worsen existing concentrations)
      const swapValidation = isSwapAcceptable(blueTeam, orangeTeam, tempBlue, tempOrange, improvement);
      let isSwapOk = swapValidation.acceptable;
      const swapRejectReason = swapValidation.rejectReason;

      // SOFT PENALTY SYSTEM for cross-tier (Orange lower ↔ Blue upper)
      const attributeThreshold = getAttributeBalanceThreshold(
        improvement,
        currentBalance,
        failedAttempts,
        winRateGapBefore,
        winRateGapAfter
      );

      const softPenalty = calculateSoftPenalty(attributeBalance, attributeThreshold, 'cross-tier swap');
      let attributeThresholdReason: string | undefined;
      let swapPenalty = 0;

      if (softPenalty.rejected) {
        isSwapOk = false;
        attributeThresholdReason = softPenalty.reason;
      } else if (softPenalty.penalty > 0) {
        swapPenalty = softPenalty.penalty;
        attributeThresholdReason = `⚠️ SOFT PENALTY: ${softPenalty.reason}`;
      }

      if (debugLog) {
        debugLog.value += `    Trying ${blueUpper.friendly_name}(T${upperTier}) ↔ ${orangeLower.friendly_name}(T${lowerTier}): `;
        debugLog.value += `balance ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`;

        // Always calculate detailed metrics for comprehensive analysis
        const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);
        const afterDetails = calculateDetailedBalanceScore(tempBlue, tempOrange, permanentGKIds);
        const issue = getTierDistributionIssues(tempBlue, tempOrange);

        // Generate comprehensive analysis
        const swapAnalysis = generateComprehensiveSwapAnalysis(
          blueUpper,
          orangeLower,
          beforeDetails,
          afterDetails,
          improvement,
          attributeBalance,
          attributeThreshold,
          isSwapOk,
          issue,
          swapRejectReason,
          attributeThresholdReason
        );

        debugLog.value += swapAnalysis;
        debugLog.value += `\n`;
      }

      // Use multi-objective evaluation instead of simple balance comparison
      if (isSwapOk) {
        const multiScoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKIds);
        const multiScoreAfter = calculateMultiObjectiveScore(tempBlue, tempOrange, permanentGKIds);
        const evaluation = evaluateSwap(multiScoreBefore, multiScoreAfter, blueTeam, orangeTeam, tempBlue, tempOrange);

        if (evaluation.isImprovement) {
          // Accept improving swaps immediately
          bestScore = newBalance;
          bestSwap = {
            bluePlayer: blueUpper,
            orangePlayer: orangeLower,
            blueTier: upperTier,
            orangeTier: lowerTier
          };
          improved = true;

          // Store multi-objective details for debug logging
          if (debugLog) {
            debugLog.value += `      ✅ Multi-objective: improved [${evaluation.improvedObjectives.join(', ')}]`;
            if (evaluation.worsenedObjectives.length > 0) {
              debugLog.value += `, worsened [${evaluation.worsenedObjectives.join(', ')}]`;
            }
            debugLog.value += `\n`;
          }
        } else if (temperature > 0) {
          // SIMULATED ANNEALING: Accept worse swaps probabilistically
          const balanceWorsening = newBalance - currentBalance; // Positive = worse

          // Only consider if worsening is not catastrophic (< 0.2 balance score worsening)
          if (balanceWorsening < 0.2) {
            const acceptanceProbability = Math.exp(-balanceWorsening / temperature);
            const randomValue = Math.random();

            if (randomValue < acceptanceProbability) {
              // Accept this worse swap!
              bestScore = newBalance;
              bestSwap = {
                bluePlayer: blueUpper,
                orangePlayer: orangeLower,
                blueTier: upperTier,
                orangeTier: lowerTier
              };
              improved = false;
              acceptedWorsening = true;

              if (debugLog) {
                debugLog.value += `      🎲 SA ACCEPTED: Cross-tier worse swap accepted\n`;
                debugLog.value += `         ΔBalance: +${balanceWorsening.toFixed(3)}, prob: ${(acceptanceProbability * 100).toFixed(1)}%, T: ${temperature.toFixed(2)}\n`;
              }
            } else if (debugLog && balanceWorsening < 0.05) {
              debugLog.value += `      🎲 SA REJECTED: ${(acceptanceProbability * 100).toFixed(1)}% chance\n`;
            }
          }
        }
      }
    }
  }

  if (debugLog) {
    if ((improved || acceptedWorsening) && bestSwap) {
      debugLog.value += `    Best cross-tier swap: ${bestSwap.bluePlayer.friendly_name}(T${bestSwap.blueTier}) ↔ ${bestSwap.orangePlayer.friendly_name}(T${bestSwap.orangeTier})\n`;
      debugLog.value += `    Rating diff: ${Math.abs(bestSwap.bluePlayer.threeLayerRating - bestSwap.orangePlayer.threeLayerRating).toFixed(2)}\n`;
      debugLog.value += `    Improvement: ${(currentBalance - bestScore).toFixed(3)} (${bestScore.toFixed(3)})\n`;
      
      // Add detailed explanation for cross-tier swaps
      const tempBlue = [...blueTeam];
      const tempOrange = [...orangeTeam];
      const blueIdx = tempBlue.findIndex(p => p.player_id === bestSwap.bluePlayer.player_id);
      const orangeIdx = tempOrange.findIndex(p => p.player_id === bestSwap.orangePlayer.player_id);
      if (blueIdx >= 0 && orangeIdx >= 0) {
        tempBlue[blueIdx] = bestSwap.orangePlayer;
        tempOrange[orangeIdx] = bestSwap.bluePlayer;
        
        const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);
        const afterDetails = calculateDetailedBalanceScore(tempBlue, tempOrange, permanentGKIds);
        
        const detailedImprovements = generateImprovementDetails(beforeDetails, afterDetails);
        
        debugLog.value += `    Reason: `;
        if (detailedImprovements) {
          // Remove the brackets and display as reason
          debugLog.value += detailedImprovements.replace(/^\s*\[/, '').replace(/\]\s*$/, '');
        } else {
          debugLog.value += acceptedWorsening ? 'Exploring alternative configuration (SA)' : 'Overall balance improvement';
        }
        debugLog.value += `\n`;
      }
    } else {
      debugLog.value += `    No beneficial cross-tier swaps found${temperature > 0 ? ' (even with SA)' : ''}\n`;
    }
  }

  return { bestSwap, bestScore, improved, acceptedWorsening };
}

/**
 * Optimize teams by trying same-tier swaps first, then cross-tier swaps between adjacent tiers
 * Starting from lowest tier upwards (Tier 5 → Tier 1)
 */
function optimizeTeams(
  initialBlueTeam: PlayerWithRating[],
  initialOrangeTeam: PlayerWithRating[],
  teamSize: number,
  ratingRange: { min: number; max: number },
  permanentGKIds: string[] = [],
  debugLog?: { value: string }
): {
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
  finalScore: number;
  wasOptimized: boolean;
  swapCount: number;
  swapDetails: Array<{ bluePlayer: string; orangePlayer: string; improvement: number; tier: number; reason?: string; balanceType?: string }>;
} {
  let blueTeam = [...initialBlueTeam];
  let orangeTeam = [...initialOrangeTeam];
  let currentBalance = calculateTierBalanceScore(blueTeam, orangeTeam, permanentGKIds);
  let wasOptimized = false;
  
  // Calculate dynamic balance threshold based on team characteristics
  const balanceThreshold = calculateDynamicBalanceThreshold(teamSize, ratingRange);
  let swapCount = 0;
  const swapDetails: Array<{ bluePlayer: string; orangePlayer: string; improvement: number; tier: number; reason?: string; balanceType?: string }> = [];
  
  if (debugLog) {
    debugLog.value += 'STEP 6: INTEGRATED OPTIMIZATION PHASE\n';
    debugLog.value += '=====================================\n';
    debugLog.value += `Current Balance: ${currentBalance.toFixed(3)}\n`;
    debugLog.value += `Dynamic Threshold: ${balanceThreshold.toFixed(3)} (team size: ${teamSize}, rating range: ${(ratingRange.max - ratingRange.min).toFixed(2)})\n`;

    // Show attribute calculation method
    debugLog.value += `\nAttribute Calculation: Weighted average with penalty for extremes\n`;
    debugLog.value += `  - Average of all 6 attribute differences\n`;
    debugLog.value += `  - 25% penalty if any attribute > 3.0\n`;
    debugLog.value += `  - 50% penalty if any attribute > 4.0\n`;

    // Show threshold adjustments
    debugLog.value += `\nThreshold Adjustments:\n`;
    debugLog.value += `  - Base: Varies by improvement (0.05→1.0, 0.1→1.5, 0.2→2.0, 0.3→2.5)\n`;
    debugLog.value += `  - Current balance modifier: ${currentBalance > 1.0 ? `+${((currentBalance - 1) * 30).toFixed(0)}%` : 'None'}\n`;
    debugLog.value += `  - Failed attempts modifier: Progressive (5→+25%, 10→+50%, 20→+100%)\n`;

    const initialDistributionFair = validateTierDistribution(blueTeam, orangeTeam);
    const distributionIssue = getTierDistributionIssues(blueTeam, orangeTeam);
    if (initialDistributionFair) {
      debugLog.value += `\nInitial Tier Distribution: FAIR\n`;
    } else {
      debugLog.value += `\nInitial Tier Distribution: CONCENTRATED (${distributionIssue})\n`;
    }

    debugLog.value += '\nOptimization Strategy:\n';
    debugLog.value += '  Pass 1: Skills Focus (2x attribute threshold)\n';
    debugLog.value += '  Pass 2: Balanced (1x attribute threshold)\n';
    debugLog.value += '  Pass 3: Fine-tuning (0.8x attribute threshold)\n';
    debugLog.value += '  Fallback: Extreme relaxation if no swaps found\n';
    debugLog.value += '\nFor each tier: try same-tier swaps first, then cross-tier swaps with adjacent tier\n';
    debugLog.value += 'Starting from lowest tier upwards (Tier 5 → Tier 1)\n\n';
  }
  
  // Check for core skill dominance (one team winning 0 of 3 core skills)
  // This must be checked BEFORE early return to ensure post-optimization pipeline runs
  const coreSkillStatus = calculateCoreSkillDominance(blueTeam, orangeTeam, permanentGKIds);
  const hasSkillDominance = coreSkillStatus.isCoreSkillDominated;

  // Only skip optimization if balance is good AND no skill dominance exists
  // If skill dominance exists (3-0 split), we MUST run the post-optimization pipeline
  if (currentBalance <= balanceThreshold && !hasSkillDominance) {
    if (debugLog) {
      debugLog.value += 'No optimization needed - balance is within threshold and skills are balanced\n';
      debugLog.value += `  Core skills: Blue ${coreSkillStatus.blueWins}/3, Orange ${coreSkillStatus.orangeWins}/3 ✓\n\n`;
    }

    // Still run post-optimization pipeline for other checks (position balance, etc.)
    const permanentGKIdSet = new Set(permanentGKIds);
    const pipelineResult = runPostOptimizationPipeline(blueTeam, orangeTeam, permanentGKIdSet, debugLog);

    return {
      blueTeam: pipelineResult.blueTeam,
      orangeTeam: pipelineResult.orangeTeam,
      finalScore: pipelineResult.balance,
      wasOptimized: pipelineResult.swapCount > 0,
      swapCount: pipelineResult.swapCount,
      swapDetails: []
    };
  }

  // Log if we're continuing due to skill dominance
  if (currentBalance <= balanceThreshold && hasSkillDominance) {
    if (debugLog) {
      debugLog.value += `⚠️ Balance within threshold (${currentBalance.toFixed(3)}) but SKILL DOMINANCE detected\n`;
      debugLog.value += `  Core skills: Blue ${coreSkillStatus.blueWins}/3, Orange ${coreSkillStatus.orangeWins}/3 - needs fix\n`;
      debugLog.value += `  Continuing to optimization to attempt skill balance correction...\n\n`;
    }
  }
  
  // Group players by tier
  const blueTiers = new Map<number, PlayerWithRating[]>();
  const orangeTiers = new Map<number, PlayerWithRating[]>();
  
  blueTeam.forEach(player => {
    const tier = player.tier ?? 1;
    if (!blueTiers.has(tier)) blueTiers.set(tier, []);
    blueTiers.get(tier)!.push(player);
  });
  
  orangeTeam.forEach(player => {
    const tier = player.tier ?? 1;
    if (!orangeTiers.has(tier)) orangeTiers.set(tier, []);
    orangeTiers.get(tier)!.push(player);
  });
  
  // Get all tiers and sort from lowest to highest (Tier 5 → Tier 1)
  const allTiers = Array.from(new Set([...blueTiers.keys(), ...orangeTiers.keys()])).sort((a, b) => b - a);
  
  let totalIterations = 0;
  const MAX_ITERATIONS = 300; // Jan 2026: INCREASED from 100 to 300 (target 200-500 for 18 players)
  const MAX_OPTIMIZATION_ROUNDS = 30; // Jan 2026: INCREASED from 10 to 30 for better exploration
  let optimizationRound = 0;
  let madeSwapThisRound = true;
  let totalFailedAttempts = 0; // Track total failed swap attempts for progressive relaxation

  // ============================================================================
  // SIMULATED ANNEALING PARAMETERS
  // ============================================================================
  let temperature = 1.0;              // Start with high exploration for probabilistic annealing
  const MIN_TEMPERATURE = 0.01;       // Minimum temperature before stopping
  const COOLING_RATE = 0.92;          // Jan 2026: Cool by 8% each round (was 20%) - slower cooling = more exploration
  const REHEAT_TEMP = 0.4;            // Reheat to this when stuck
  let consecutiveNoImprovement = 0;   // Track rounds without improvement
  const REHEAT_THRESHOLD = 3;         // Reheat after 3 rounds without improvement

  // Convergence detection parameters
  const CONVERGENCE_THRESHOLD = 0.001; // Score change below this is considered stable
  const MIN_ITERATIONS_BEFORE_CONVERGE = 50; // Jan 2026: INCREASED from 20 to 50 for more exploration
  const STABLE_ROUNDS_TO_CONVERGE = 5;  // Consecutive stable rounds to trigger convergence
  let stableRoundCount = 0;             // Track consecutive stable rounds
  let previousRoundBalance = currentBalance; // Track previous balance for stability check

  // Best state tracking (to prevent losing good solutions)
  let bestBlueTeam = [...blueTeam];
  let bestOrangeTeam = [...orangeTeam];
  let bestBalance = currentBalance;
  let bestSwapCount = swapCount;

  if (debugLog) {
    debugLog.value += `\n🌡️  SIMULATED ANNEALING ENABLED\n`;
    debugLog.value += `Initial temperature: ${temperature.toFixed(2)}\n`;
    debugLog.value += `Cooling rate: ${COOLING_RATE} (${((1-COOLING_RATE)*100).toFixed(0)}% per round)\n`;
    debugLog.value += `Min temperature: ${MIN_TEMPERATURE}\n`;
    debugLog.value += `Reheat threshold: ${REHEAT_THRESHOLD} rounds without improvement\n\n`;
  }

  // Multi-pass optimization strategy
  const OPTIMIZATION_PASSES = [
    { name: 'Pass 1: Skills Focus', attributeMultiplier: 2.0, description: 'Prioritize skill balance with relaxed attribute constraints' },
    { name: 'Pass 2: Balanced', attributeMultiplier: 1.0, description: 'Normal balance between skills and attributes' },
    { name: 'Pass 3: Fine-tuning', attributeMultiplier: 0.8, description: 'Strict constraints for minor adjustments' }
  ];

  let currentPassIndex = 0;

  // Continue optimization rounds while temperature is high enough OR improvements are being made
  // Simulated annealing allows continuing even without improvements (temperature > MIN_TEMPERATURE)
  while ((madeSwapThisRound || temperature > MIN_TEMPERATURE) && optimizationRound < MAX_OPTIMIZATION_ROUNDS && currentBalance > balanceThreshold * 0.8) {
    madeSwapThisRound = false;
    optimizationRound++;

    // Check if we should reheat (stuck for too long)
    if (consecutiveNoImprovement >= REHEAT_THRESHOLD && temperature < REHEAT_TEMP) {
      temperature = REHEAT_TEMP;
      consecutiveNoImprovement = 0;
      if (debugLog) {
        debugLog.value += `\n🔥 REHEATING: Stuck for ${REHEAT_THRESHOLD} rounds, reheating to T=${temperature.toFixed(2)}\n`;
        debugLog.value += `   Returning to best known state (balance: ${bestBalance.toFixed(3)})\n\n`;
      }
      // Restore best known state
      blueTeam = [...bestBlueTeam];
      orangeTeam = [...bestOrangeTeam];
      currentBalance = bestBalance;
      swapCount = bestSwapCount;
    }

    if (debugLog) {
      debugLog.value += `\n--- Round ${optimizationRound} (T=${temperature.toFixed(3)}, balance=${currentBalance.toFixed(3)}) ---\n`;
    }

    // Move to next pass if we've exhausted attempts in current pass
    if (totalFailedAttempts > 30 && currentPassIndex < OPTIMIZATION_PASSES.length - 1) {
      currentPassIndex++;
      totalFailedAttempts = 0; // Reset for new pass
      if (debugLog) {
        const pass = OPTIMIZATION_PASSES[currentPassIndex];
        debugLog.value += `\nMoving to ${pass.name} - ${pass.description}\n`;
        debugLog.value += `Attribute threshold multiplier: ${pass.attributeMultiplier}x\n\n`;
      }

      // Phase-specific attribute targeting: Run in Pass 2 if moderate gaps exist
      if (currentPassIndex === 1 && currentBalance > balanceThreshold) { // Pass 2 = index 1
        const attributeSwapMade = tryAttributeTargetedOptimization(blueTeam, orangeTeam, permanentGKIds, debugLog);
        if (attributeSwapMade) {
          const permanentGKArray = Array.from(permanentGKIds);
          const newScore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKArray);
          currentBalance = newScore.skillsBalance;
          swapCount++;
          wasOptimized = true;
          madeSwapThisRound = true;
        }
      }
    }

    if (debugLog && optimizationRound > 1) {
      debugLog.value += `Starting optimization round ${optimizationRound} (balance: ${currentBalance.toFixed(3)})\n`;
      debugLog.value += `Current pass: ${OPTIMIZATION_PASSES[currentPassIndex].name}\n\n`;
    }

    // Integrated optimization: for each tier, try same-tier then cross-tier swaps
    // Start from lowest tier upwards (Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1)
    for (let tierIndex = 0; tierIndex < allTiers.length; tierIndex++) {
    const currentTier = allTiers[tierIndex];
    
    // Stop if we've reached acceptable balance
    if (currentBalance <= balanceThreshold) {
      if (debugLog) {
        debugLog.value += `Balance threshold reached (${currentBalance.toFixed(3)} ≤ ${balanceThreshold}), stopping optimization\n\n`;
      }
      break;
    }
    
    if (debugLog) {
      debugLog.value += `Optimizing Tier ${currentTier}:\n`;
    }
    
    const blueTierPlayers = blueTiers.get(currentTier) || [];
    const orangeTierPlayers = orangeTiers.get(currentTier) || [];
    
    // Phase 1: Try same-tier swaps (with simulated annealing)
    const sameTierResult = trySameTierSwaps(
      currentTier,
      blueTeam,
      orangeTeam,
      blueTierPlayers,
      orangeTierPlayers,
      currentBalance,
      permanentGKIds,
      totalFailedAttempts,
      temperature, // Pass current temperature for SA
      debugLog
    );

    // Track failed attempts if no improvement found
    // SA-accepted swaps also count as "progress" to reset the counter
    if (!sameTierResult.improved && !sameTierResult.acceptedWorsening) {
      totalFailedAttempts++;
    } else {
      totalFailedAttempts = 0; // Reset on successful swap or SA acceptance
    }

    // Execute same-tier swap if beneficial OR accepted via SA
    if ((sameTierResult.improved || sameTierResult.acceptedWorsening) && sameTierResult.bestSwap) {
      const blueIndex = blueTeam.findIndex(p => p.player_id === sameTierResult.bestSwap.bluePlayer.player_id);
      const orangeIndex = orangeTeam.findIndex(p => p.player_id === sameTierResult.bestSwap.orangePlayer.player_id);
      
      // Calculate before swap details
      const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

      if (debugLog) {
        if (sameTierResult.acceptedWorsening) {
          debugLog.value += `  🎲 Executing SA-ACCEPTED swap: ${sameTierResult.bestSwap.bluePlayer.friendly_name} ↔ ${sameTierResult.bestSwap.orangePlayer.friendly_name}\n`;
          debugLog.value += `    Balance worsened: ${currentBalance.toFixed(3)} → ${sameTierResult.bestScore.toFixed(3)} (exploring, T=${temperature.toFixed(2)})\n`;
        } else {
          debugLog.value += `  Executing same-tier swap: ${sameTierResult.bestSwap.bluePlayer.friendly_name} ↔ ${sameTierResult.bestSwap.orangePlayer.friendly_name}\n`;
          debugLog.value += `    Balance improved: ${currentBalance.toFixed(3)} → ${sameTierResult.bestScore.toFixed(3)}\n`;
        }
      }

      blueTeam[blueIndex] = sameTierResult.bestSwap.orangePlayer;
      orangeTeam[orangeIndex] = sameTierResult.bestSwap.bluePlayer;
      swapCount++;

      // Calculate after swap details
      const afterDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

      // Log detailed metric changes
      if (debugLog) {
        debugLog.value += `    Metric Changes:\n`;
        debugLog.value += `      Attack: ${beforeDetails.attackDiff.toFixed(2)} → ${afterDetails.attackDiff.toFixed(2)}\n`;
        debugLog.value += `      Defense: ${beforeDetails.defenseDiff.toFixed(2)} → ${afterDetails.defenseDiff.toFixed(2)}\n`;
        debugLog.value += `      Game IQ: ${beforeDetails.gameIqDiff.toFixed(2)} → ${afterDetails.gameIqDiff.toFixed(2)}\n`;
        if (beforeDetails.hasAttributes && afterDetails.hasAttributes) {
          debugLog.value += `      Attributes:\n`;
          if (Math.abs(beforeDetails.paceDiff! - afterDetails.paceDiff!) > 0.01) {
            debugLog.value += `        Pace: ${beforeDetails.paceDiff!.toFixed(2)} → ${afterDetails.paceDiff!.toFixed(2)}\n`;
          }
          if (Math.abs(beforeDetails.shootingDiff! - afterDetails.shootingDiff!) > 0.01) {
            debugLog.value += `        Shooting: ${beforeDetails.shootingDiff!.toFixed(2)} → ${afterDetails.shootingDiff!.toFixed(2)}\n`;
          }
          if (Math.abs(beforeDetails.passingDiff! - afterDetails.passingDiff!) > 0.01) {
            debugLog.value += `        Passing: ${beforeDetails.passingDiff!.toFixed(2)} → ${afterDetails.passingDiff!.toFixed(2)}\n`;
          }
          if (Math.abs(beforeDetails.dribblingDiff! - afterDetails.dribblingDiff!) > 0.01) {
            debugLog.value += `        Dribbling: ${beforeDetails.dribblingDiff!.toFixed(2)} → ${afterDetails.dribblingDiff!.toFixed(2)}\n`;
          }
          if (Math.abs(beforeDetails.defendingDiff! - afterDetails.defendingDiff!) > 0.01) {
            debugLog.value += `        Defending: ${beforeDetails.defendingDiff!.toFixed(2)} → ${afterDetails.defendingDiff!.toFixed(2)}\n`;
          }
          if (Math.abs(beforeDetails.physicalDiff! - afterDetails.physicalDiff!) > 0.01) {
            debugLog.value += `        Physical: ${beforeDetails.physicalDiff!.toFixed(2)} → ${afterDetails.physicalDiff!.toFixed(2)}\n`;
          }
        }
        if (beforeDetails.blueWinRate && afterDetails.blueWinRate) {
          const winRateGapBefore = Math.abs(beforeDetails.blueWinRate - beforeDetails.orangeWinRate!);
          const winRateGapAfter = Math.abs(afterDetails.blueWinRate - afterDetails.orangeWinRate!);
          if (Math.abs(winRateGapBefore - winRateGapAfter) > 0.5) {
            debugLog.value += `      Win Rate Gap: ${winRateGapBefore.toFixed(1)}% → ${winRateGapAfter.toFixed(1)}%\n`;
          }
        }
      }

      const detailedReason = generateImprovementDetails(beforeDetails, afterDetails);
      
      // Track swap details
      swapDetails.push({
        bluePlayer: sameTierResult.bestSwap.bluePlayer.friendly_name,
        orangePlayer: sameTierResult.bestSwap.orangePlayer.friendly_name,
        improvement: currentBalance - sameTierResult.bestScore,
        tier: currentTier,
        reason: detailedReason ? detailedReason.replace(/^\s*\[/, '').replace(/\]\s*$/, '') : 'Overall balance improvement'
      });
      
      // Update tier groups
      const bluePlayerIndex = blueTierPlayers.findIndex(p => p.player_id === sameTierResult.bestSwap.bluePlayer.player_id);
      const orangePlayerIndex = orangeTierPlayers.findIndex(p => p.player_id === sameTierResult.bestSwap.orangePlayer.player_id);
      
      if (bluePlayerIndex !== -1) blueTierPlayers[bluePlayerIndex] = sameTierResult.bestSwap.orangePlayer;
      if (orangePlayerIndex !== -1) orangeTierPlayers[orangePlayerIndex] = sameTierResult.bestSwap.bluePlayer;
      
      currentBalance = sameTierResult.bestScore;
      wasOptimized = true;
      madeSwapThisRound = true;
      totalIterations++
      
      // Check if threshold reached
      if (currentBalance <= balanceThreshold) {
        if (debugLog) {
          debugLog.value += `    Balance threshold reached (${currentBalance.toFixed(3)} ≤ ${balanceThreshold}), stopping optimization\n\n`;
        }
        break;
      }
    }
    
    // Phase 2: Try cross-tier swaps with next tier up (if exists)
    if (tierIndex < allTiers.length - 1) {
      const upperTier = allTiers[tierIndex + 1];
      const blueUpperPlayers = blueTiers.get(upperTier) || [];
      const orangeUpperPlayers = orangeTiers.get(upperTier) || [];
      
      const crossTierResult = tryCrossTierSwaps(
        currentTier,
        upperTier,
        blueTeam,
        orangeTeam,
        blueTierPlayers,
        orangeTierPlayers,
        blueUpperPlayers,
        orangeUpperPlayers,
        currentBalance,
        permanentGKIds,
        totalFailedAttempts,
        temperature, // Pass current temperature for SA
        debugLog
      );

      // Track failed attempts if no improvement found
      // SA-accepted swaps also count as "progress" to reset the counter
      if (!crossTierResult.improved && !crossTierResult.acceptedWorsening) {
        totalFailedAttempts++;
      } else {
        totalFailedAttempts = 0; // Reset on successful swap or SA acceptance
      }

      // Execute cross-tier swap if beneficial OR accepted via SA
      if ((crossTierResult.improved || crossTierResult.acceptedWorsening) && crossTierResult.bestSwap) {
        const blueIndex = blueTeam.findIndex(p => p.player_id === crossTierResult.bestSwap.bluePlayer.player_id);
        const orangeIndex = orangeTeam.findIndex(p => p.player_id === crossTierResult.bestSwap.orangePlayer.player_id);
        
        // Calculate before swap details
        const beforeCrossDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

        if (debugLog) {
          if (crossTierResult.acceptedWorsening) {
            debugLog.value += `  🎲 Executing SA-ACCEPTED cross-tier swap: ${crossTierResult.bestSwap.bluePlayer.friendly_name}(T${crossTierResult.bestSwap.blueTier}) ↔ ${crossTierResult.bestSwap.orangePlayer.friendly_name}(T${crossTierResult.bestSwap.orangeTier})\n`;
            debugLog.value += `    Balance worsened: ${currentBalance.toFixed(3)} → ${crossTierResult.bestScore.toFixed(3)} (exploring, T=${temperature.toFixed(2)})\n`;
          } else {
            debugLog.value += `  Executing cross-tier swap: ${crossTierResult.bestSwap.bluePlayer.friendly_name}(T${crossTierResult.bestSwap.blueTier}) ↔ ${crossTierResult.bestSwap.orangePlayer.friendly_name}(T${crossTierResult.bestSwap.orangeTier})\n`;
            debugLog.value += `    Balance improved: ${currentBalance.toFixed(3)} → ${crossTierResult.bestScore.toFixed(3)}\n`;
          }
        }

        blueTeam[blueIndex] = crossTierResult.bestSwap.orangePlayer;
        orangeTeam[orangeIndex] = crossTierResult.bestSwap.bluePlayer;
        swapCount++;

        // Calculate after swap details
        const afterCrossDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

        // Log detailed metric changes
        if (debugLog) {
          debugLog.value += `    Metric Changes:\n`;
          debugLog.value += `      Attack: ${beforeCrossDetails.attackDiff.toFixed(2)} → ${afterCrossDetails.attackDiff.toFixed(2)}\n`;
          debugLog.value += `      Defense: ${beforeCrossDetails.defenseDiff.toFixed(2)} → ${afterCrossDetails.defenseDiff.toFixed(2)}\n`;
          debugLog.value += `      Game IQ: ${beforeCrossDetails.gameIqDiff.toFixed(2)} → ${afterCrossDetails.gameIqDiff.toFixed(2)}\n`;
          if (beforeCrossDetails.hasAttributes && afterCrossDetails.hasAttributes) {
            debugLog.value += `      Attributes:\n`;
            if (Math.abs(beforeCrossDetails.paceDiff! - afterCrossDetails.paceDiff!) > 0.01) {
              debugLog.value += `        Pace: ${beforeCrossDetails.paceDiff!.toFixed(2)} → ${afterCrossDetails.paceDiff!.toFixed(2)}\n`;
            }
            if (Math.abs(beforeCrossDetails.shootingDiff! - afterCrossDetails.shootingDiff!) > 0.01) {
              debugLog.value += `        Shooting: ${beforeCrossDetails.shootingDiff!.toFixed(2)} → ${afterCrossDetails.shootingDiff!.toFixed(2)}\n`;
            }
            if (Math.abs(beforeCrossDetails.passingDiff! - afterCrossDetails.passingDiff!) > 0.01) {
              debugLog.value += `        Passing: ${beforeCrossDetails.passingDiff!.toFixed(2)} → ${afterCrossDetails.passingDiff!.toFixed(2)}\n`;
            }
            if (Math.abs(beforeCrossDetails.dribblingDiff! - afterCrossDetails.dribblingDiff!) > 0.01) {
              debugLog.value += `        Dribbling: ${beforeCrossDetails.dribblingDiff!.toFixed(2)} → ${afterCrossDetails.dribblingDiff!.toFixed(2)}\n`;
            }
            if (Math.abs(beforeCrossDetails.defendingDiff! - afterCrossDetails.defendingDiff!) > 0.01) {
              debugLog.value += `        Defending: ${beforeCrossDetails.defendingDiff!.toFixed(2)} → ${afterCrossDetails.defendingDiff!.toFixed(2)}\n`;
            }
            if (Math.abs(beforeCrossDetails.physicalDiff! - afterCrossDetails.physicalDiff!) > 0.01) {
              debugLog.value += `        Physical: ${beforeCrossDetails.physicalDiff!.toFixed(2)} → ${afterCrossDetails.physicalDiff!.toFixed(2)}\n`;
            }
          }
          if (beforeCrossDetails.blueWinRate && afterCrossDetails.blueWinRate) {
            const winRateGapBefore = Math.abs(beforeCrossDetails.blueWinRate - beforeCrossDetails.orangeWinRate!);
            const winRateGapAfter = Math.abs(afterCrossDetails.blueWinRate - afterCrossDetails.orangeWinRate!);
            if (Math.abs(winRateGapBefore - winRateGapAfter) > 0.5) {
              debugLog.value += `      Win Rate Gap: ${winRateGapBefore.toFixed(1)}% → ${winRateGapAfter.toFixed(1)}%\n`;
            }
          }
        }

        const crossReason = generateImprovementDetails(beforeCrossDetails, afterCrossDetails);
        
        // Track swap details  
        swapDetails.push({
          bluePlayer: crossTierResult.bestSwap.bluePlayer.friendly_name,
          orangePlayer: crossTierResult.bestSwap.orangePlayer.friendly_name,
          improvement: currentBalance - crossTierResult.bestScore,
          tier: -1, // Special marker for cross-tier swaps
          reason: crossReason ? crossReason.replace(/^\s*\[/, '').replace(/\]\s*$/, '') : 'Overall balance improvement'
        });
        
        // Update tier groups
        const blueTierOld = crossTierResult.bestSwap.blueTier;
        const orangeTierOld = crossTierResult.bestSwap.orangeTier;
        
        // Remove players from old tiers
        const blueOldTierPlayers = blueTiers.get(blueTierOld);
        const orangeOldTierPlayers = orangeTiers.get(orangeTierOld);
        
        if (blueOldTierPlayers) {
          const playerIndex = blueOldTierPlayers.findIndex(p => p.player_id === crossTierResult.bestSwap.bluePlayer.player_id);
          if (playerIndex !== -1) {
            blueOldTierPlayers.splice(playerIndex, 1);
          }
        }
        
        if (orangeOldTierPlayers) {
          const playerIndex = orangeOldTierPlayers.findIndex(p => p.player_id === crossTierResult.bestSwap.orangePlayer.player_id);
          if (playerIndex !== -1) {
            orangeOldTierPlayers.splice(playerIndex, 1);
          }
        }
        
        // Add players to new tiers
        if (!blueTiers.has(orangeTierOld)) blueTiers.set(orangeTierOld, []);
        if (!orangeTiers.has(blueTierOld)) orangeTiers.set(blueTierOld, []);
        
        blueTiers.get(orangeTierOld)!.push(crossTierResult.bestSwap.orangePlayer);
        orangeTiers.get(blueTierOld)!.push(crossTierResult.bestSwap.bluePlayer);
        
        currentBalance = crossTierResult.bestScore;
        wasOptimized = true;
        madeSwapThisRound = true;
        totalIterations++
        
        // Check if threshold reached
        if (currentBalance <= balanceThreshold) {
          if (debugLog) {
            debugLog.value += `    Balance threshold reached (${currentBalance.toFixed(3)} ≤ ${balanceThreshold}), stopping optimization\n\n`;
          }
          break;
        }
      }

      // Phase 3: If stuck after many attempts, try non-adjacent tier swaps for elite shooter balance
      if (!crossTierResult.improved && totalFailedAttempts > 25) {
        // Calculate current shooting imbalance focusing on elite shooters
        const shootingDist = analyzeShootingDistribution([...blueTeam, ...orangeTeam]);
        const shootingImbalance = calculateShootingImbalance(blueTeam, orangeTeam, shootingDist);

        // Count elite shooters
        const blueElite = blueTeam.filter(p => (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90).length;
        const orangeElite = orangeTeam.filter(p => (p.derived_attributes?.shooting || 0) >= shootingDist.percentiles.p90).length;
        const eliteGap = Math.abs(blueElite - orangeElite);

        // Only try non-adjacent swaps if shooting imbalance is significant OR elite shooter clustering exists
        if (shootingImbalance > 1.5 || eliteGap > 1) {
          if (debugLog) {
            debugLog.value += `  Shooting imbalance detected (score: ${shootingImbalance.toFixed(2)}, elite gap: ${eliteGap})\n`;
            debugLog.value += `  Attempting non-adjacent tier swaps to fix shooter distribution\n`;
          }

          // Try swaps with all other tiers to fix shooting
          for (let otherTierIndex = 0; otherTierIndex < allTiers.length; otherTierIndex++) {
            if (otherTierIndex === tierIndex || otherTierIndex === tierIndex + 1) continue; // Skip current and adjacent

            const otherTier = allTiers[otherTierIndex];
            const otherBluePlayers = blueTiers.get(otherTier) || [];
            const otherOrangePlayers = orangeTiers.get(otherTier) || [];

            // Only try if there are players to swap
            if ((blueTierPlayers.length === 0 && orangeTierPlayers.length === 0) ||
                (otherBluePlayers.length === 0 && otherOrangePlayers.length === 0)) {
              continue;
            }

            const nonAdjacentResult = tryCrossTierSwaps(
              currentTier,
              otherTier,
              blueTeam,
              orangeTeam,
              blueTierPlayers,
              orangeTierPlayers,
              otherBluePlayers,
              otherOrangePlayers,
              currentBalance,
              permanentGKIds,
              totalFailedAttempts,
              temperature, // Pass current temperature for SA
              debugLog
            );

            if ((nonAdjacentResult.improved || nonAdjacentResult.acceptedWorsening) && nonAdjacentResult.bestSwap) {
              const blueIndex = blueTeam.findIndex(p => p.player_id === nonAdjacentResult.bestSwap.bluePlayer.player_id);
              const orangeIndex = orangeTeam.findIndex(p => p.player_id === nonAdjacentResult.bestSwap.orangePlayer.player_id);

              const beforeNonAdjacentDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

              if (debugLog) {
                if (nonAdjacentResult.acceptedWorsening) {
                  debugLog.value += `  🎲 Executing SA-ACCEPTED non-adjacent tier swap:\n`;
                } else {
                  debugLog.value += `  Executing non-adjacent tier swap for shooting balance:\n`;
                }
                debugLog.value += `    ${nonAdjacentResult.bestSwap.bluePlayer.friendly_name} (T${nonAdjacentResult.bestSwap.blueTier}) ↔ `;
                debugLog.value += `${nonAdjacentResult.bestSwap.orangePlayer.friendly_name} (T${nonAdjacentResult.bestSwap.orangeTier})\n`;
                if (nonAdjacentResult.acceptedWorsening) {
                  debugLog.value += `    Balance worsened: ${currentBalance.toFixed(3)} → ${nonAdjacentResult.bestScore.toFixed(3)} (exploring, T=${temperature.toFixed(2)})\n`;
                } else {
                  debugLog.value += `    Balance improved: ${currentBalance.toFixed(3)} → ${nonAdjacentResult.bestScore.toFixed(3)}\n`;
                }
              }

              // Perform the swap
              blueTeam[blueIndex] = nonAdjacentResult.bestSwap.orangePlayer;
              orangeTeam[orangeIndex] = nonAdjacentResult.bestSwap.bluePlayer;
              swapCount++;

              const afterNonAdjacentDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

              // Log detailed metric changes
              if (debugLog) {
                debugLog.value += `    Metric Changes:\n`;
                debugLog.value += `      Attack: ${beforeNonAdjacentDetails.attackDiff.toFixed(2)} → ${afterNonAdjacentDetails.attackDiff.toFixed(2)}\n`;
                debugLog.value += `      Defense: ${beforeNonAdjacentDetails.defenseDiff.toFixed(2)} → ${afterNonAdjacentDetails.defenseDiff.toFixed(2)}\n`;
                debugLog.value += `      Game IQ: ${beforeNonAdjacentDetails.gameIqDiff.toFixed(2)} → ${afterNonAdjacentDetails.gameIqDiff.toFixed(2)}\n`;
                if (beforeNonAdjacentDetails.shootingDiff !== undefined && afterNonAdjacentDetails.shootingDiff !== undefined) {
                  debugLog.value += `      Shooting: ${beforeNonAdjacentDetails.shootingDiff.toFixed(2)} → ${afterNonAdjacentDetails.shootingDiff.toFixed(2)}\n`;
                }
              }

              const nonAdjacentReason = generateImprovementDetails(beforeNonAdjacentDetails, afterNonAdjacentDetails);
              swapDetails.push({
                bluePlayer: nonAdjacentResult.bestSwap.bluePlayer.friendly_name,
                orangePlayer: nonAdjacentResult.bestSwap.orangePlayer.friendly_name,
                improvement: currentBalance - nonAdjacentResult.bestScore,
                tier: -2, // Special marker for non-adjacent tier swaps
                reason: nonAdjacentReason ? nonAdjacentReason.replace(/^\s*\[/, '').replace(/\]\s*$/, '') : 'Shooting balance improvement'
              });

              // Update tier groups
              const blueTierOld = nonAdjacentResult.bestSwap.blueTier;
              const orangeTierOld = nonAdjacentResult.bestSwap.orangeTier;

              // Remove players from old tiers
              const blueOldTierPlayers = blueTiers.get(blueTierOld);
              const orangeOldTierPlayers = orangeTiers.get(orangeTierOld);

              if (blueOldTierPlayers) {
                const playerIndex = blueOldTierPlayers.findIndex(p => p.player_id === nonAdjacentResult.bestSwap.bluePlayer.player_id);
                if (playerIndex !== -1) {
                  blueOldTierPlayers.splice(playerIndex, 1);
                }
              }

              if (orangeOldTierPlayers) {
                const playerIndex = orangeOldTierPlayers.findIndex(p => p.player_id === nonAdjacentResult.bestSwap.orangePlayer.player_id);
                if (playerIndex !== -1) {
                  orangeOldTierPlayers.splice(playerIndex, 1);
                }
              }

              // Add players to new tiers
              if (!blueTiers.has(orangeTierOld)) blueTiers.set(orangeTierOld, []);
              if (!orangeTiers.has(blueTierOld)) orangeTiers.set(blueTierOld, []);

              blueTiers.get(orangeTierOld)!.push(nonAdjacentResult.bestSwap.orangePlayer);
              orangeTiers.get(blueTierOld)!.push(nonAdjacentResult.bestSwap.bluePlayer);

              currentBalance = nonAdjacentResult.bestScore;
              wasOptimized = true;
              madeSwapThisRound = true;
              totalFailedAttempts = 0;
              totalIterations++;

              // Check if threshold reached
              if (currentBalance <= balanceThreshold) {
                if (debugLog) {
                  debugLog.value += `    Balance threshold reached (${currentBalance.toFixed(3)} ≤ ${balanceThreshold}), stopping optimization\n\n`;
                }
                break;
              }

              break; // Exit the loop after successful swap
            }
          }
        }
      }
    }

    if (debugLog) {
      debugLog.value += `  Tier ${currentTier} optimization complete. Current balance: ${currentBalance.toFixed(3)}\n\n`;
    }
  }

  // ============================================================================
  // SIMULATED ANNEALING: End of round bookkeeping
  // ============================================================================

  // Track if this round improved the best known solution
  if (currentBalance < bestBalance) {
    bestBalance = currentBalance;
    bestBlueTeam = [...blueTeam];
    bestOrangeTeam = [...orangeTeam];
    bestSwapCount = swapCount;
    consecutiveNoImprovement = 0;
    if (debugLog) {
      debugLog.value += `✅ New best solution found! Balance: ${bestBalance.toFixed(3)}\n`;
    }
  } else {
    consecutiveNoImprovement++;
  }

  // Cool down temperature
  const oldTemp = temperature;
  temperature *= COOLING_RATE;

  if (debugLog) {
    debugLog.value += `❄️  Cooling: T ${oldTemp.toFixed(3)} → ${temperature.toFixed(3)}`;
    if (consecutiveNoImprovement > 0) {
      debugLog.value += ` (${consecutiveNoImprovement} rounds without improvement)`;
    }
    debugLog.value += `\n`;
  }

  // Convergence detection: check if score has stabilized
  const scoreChange = Math.abs(currentBalance - previousRoundBalance);
  if (scoreChange < CONVERGENCE_THRESHOLD) {
    stableRoundCount++;
  } else {
    stableRoundCount = 0;
  }
  previousRoundBalance = currentBalance;

  // Early exit if converged (stable for enough rounds after minimum iterations)
  if (stableRoundCount >= STABLE_ROUNDS_TO_CONVERGE && totalIterations >= MIN_ITERATIONS_BEFORE_CONVERGE) {
    if (debugLog) {
      debugLog.value += `\n🎯 CONVERGED: Score stable (< ${CONVERGENCE_THRESHOLD} change) for ${stableRoundCount} rounds\n`;
      debugLog.value += `   Exiting early after ${totalIterations} iterations (min: ${MIN_ITERATIONS_BEFORE_CONVERGE})\n`;
    }
    break;
  }

  // If temperature drops too low, stop optimizing
  if (temperature < MIN_TEMPERATURE && !madeSwapThisRound) {
    if (debugLog) {
      debugLog.value += `\n🥶 Temperature dropped below minimum (${MIN_TEMPERATURE}), stopping optimization\n`;
    }
    break;
  }

  } // End of while loop for optimization rounds

  // ============================================================================
  // NEW: POST-OPTIMIZATION PIPELINE (Replaces old scattered fixes)
  // Runs BEFORE best solution comparison to ensure fixes are applied and preserved
  // ============================================================================
  if (debugLog) {
    debugLog.value += `\nSimulated annealing complete after ${totalIterations} iterations across ${optimizationRound} round(s)\n`;
    debugLog.value += `SA final balance: ${currentBalance.toFixed(3)} (best tracked: ${bestBalance.toFixed(3)})\n`;
  }

  // Run the unified post-optimization pipeline on current teams
  const permanentGKIdSet = new Set(permanentGKIds);
  const pipelineResult = runPostOptimizationPipeline(blueTeam, orangeTeam, permanentGKIdSet, debugLog);

  // Update tracking from pipeline
  swapCount += pipelineResult.swapCount;
  currentBalance = pipelineResult.balance;
  if (pipelineResult.swapCount > 0) {
    wasOptimized = true;
  }

  // ============================================================================
  // COMPARE WITH BEST SOLUTION (after pipeline fixes)
  // Only restore best if it would improve balance AND doesn't have critical issues
  // ============================================================================
  const currentValidation = pipelineResult.validation;

  // Check if best solution would be better
  if (currentBalance > bestBalance) {
    // Run validation on best teams to check for critical issues
    const bestValidation = finalValidation(bestBlueTeam, bestOrangeTeam, permanentGKIdSet);

    // Prioritize solutions that pass validation, even if balance score is slightly worse
    const currentPassesCritical = currentValidation.positionBalance.valid && currentValidation.coreSkillBalance.valid;
    const bestPassesCritical = bestValidation.positionBalance.valid && bestValidation.coreSkillBalance.valid;

    if (debugLog) {
      debugLog.value += `\n📊 Comparing solutions:\n`;
      debugLog.value += `   Current: balance=${currentBalance.toFixed(3)}, position=${currentValidation.positionBalance.valid ? '✓' : '✗'}, coreSkill=${currentValidation.coreSkillBalance.valid ? '✓' : '✗'}\n`;
      debugLog.value += `   Best:    balance=${bestBalance.toFixed(3)}, position=${bestValidation.positionBalance.valid ? '✓' : '✗'}, coreSkill=${bestValidation.coreSkillBalance.valid ? '✓' : '✗'}\n`;
    }

    // Decision logic:
    // 1. If current passes critical checks but best doesn't → keep current
    // 2. If both pass or both fail → use better balance score
    // 3. If best passes but current doesn't → restore best, then re-run pipeline
    if (currentPassesCritical && !bestPassesCritical) {
      // Keep current - it passes validation even if balance is worse
      if (debugLog) {
        debugLog.value += `   → Keeping current (passes validation)\n`;
      }
    } else if (!currentPassesCritical && bestPassesCritical) {
      // Restore best and re-run pipeline on it
      if (debugLog) {
        debugLog.value += `   → Restoring best and re-running pipeline\n`;
      }
      blueTeam = [...bestBlueTeam];
      orangeTeam = [...bestOrangeTeam];

      // Re-run pipeline on restored best
      const bestPipelineResult = runPostOptimizationPipeline(blueTeam, orangeTeam, permanentGKIdSet, debugLog);
      swapCount += bestPipelineResult.swapCount;
      currentBalance = bestPipelineResult.balance;
      if (bestPipelineResult.swapCount > 0) {
        wasOptimized = true;
      }
    } else {
      // Both pass or both fail - use better balance
      if (bestBalance < currentBalance) {
        if (debugLog) {
          debugLog.value += `   → Restoring best (better balance)\n`;
        }
        blueTeam = [...bestBlueTeam];
        orangeTeam = [...bestOrangeTeam];

        // Re-run pipeline on restored best
        const bestPipelineResult = runPostOptimizationPipeline(blueTeam, orangeTeam, permanentGKIdSet, debugLog);
        swapCount += bestPipelineResult.swapCount;
        currentBalance = bestPipelineResult.balance;
        if (bestPipelineResult.swapCount > 0) {
          wasOptimized = true;
        }
      } else {
        if (debugLog) {
          debugLog.value += `   → Keeping current\n`;
        }
      }
    }
  }

  // ============================================================================
  // FINAL SUMMARY LOGGING
  // ============================================================================
  if (debugLog) {
    debugLog.value += '\n';
    if (wasOptimized) {
      debugLog.value += `Optimization complete after ${totalIterations} SA iterations\n`;
      debugLog.value += `Total swaps: ${swapCount}\n`;
      debugLog.value += `Final balance: ${currentBalance.toFixed(3)}\n`;
    } else {
      debugLog.value += 'No beneficial swaps found\n';
      if (totalFailedAttempts > 20) {
        debugLog.value += `Note: ${totalFailedAttempts} swap attempts were rejected by constraints\n`;
      }
    }
    const finalDistributionFair = validateTierDistribution(blueTeam, orangeTeam);
    const finalDistributionIssue = getTierDistributionIssues(blueTeam, orangeTeam);
    if (finalDistributionFair) {
      debugLog.value += `Final Tier Distribution: FAIR\n`;
    } else {
      debugLog.value += `Final Tier Distribution: CONCENTRATED (${finalDistributionIssue})\n`;
    }

    // Log final position balance status
    logPositionBalanceStatus(blueTeam, orangeTeam, debugLog);
    debugLog.value += '\n';
  }
  
  return {
    blueTeam,
    orangeTeam,
    finalScore: currentBalance,
    wasOptimized,
    swapCount,
    swapDetails
  };
}

/**
 * Calculate confidence level based on percentage of unknown players
 */
function calculateConfidence(players: PlayerWithRating[]): {
  level: 'high' | 'medium' | 'low';
  message: string;
  unknownCount: number;
  totalCount: number;
} {
  const unknownCount = players.filter(p => !p.total_games || p.total_games < MIN_GAMES_FOR_STATS).length;
  const totalCount = players.length;
  const unknownPercentage = (unknownCount / totalCount) * 100;
  
  if (unknownPercentage > 50) {
    return {
      level: 'low',
      message: 'Low confidence - many new players without performance history',
      unknownCount,
      totalCount
    };
  } else if (unknownPercentage > 25) {
    return {
      level: 'medium',
      message: 'Medium confidence - some new players without performance history',
      unknownCount,
      totalCount
    };
  } else {
    return {
      level: 'high',
      message: 'High confidence - most players have performance history',
      unknownCount,
      totalCount
    };
  }
}

/**
 * Format performance description for debug log
 */
function formatPerformanceDescription(winRate: number, goalDiff: number, isOverall: boolean = true): string {
  const winRatePercent = winRate > 1 ? winRate : winRate * 100;
  
  if (isOverall) {
    // Overall performance categorization
    if (winRatePercent >= 55 && goalDiff >= 15) return `Strong (${winRatePercent.toFixed(0)}%/+${goalDiff})`;
    if (winRatePercent >= 50 && goalDiff >= 5) return `Good (${winRatePercent.toFixed(0)}%/+${goalDiff})`;
    if (winRatePercent >= 45 && goalDiff >= -5) return `Average (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
    return `Poor (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
  } else {
    // Recent form categorization
    if (winRatePercent >= 60 && goalDiff >= 10) return `Excellent (${winRatePercent.toFixed(0)}%/+${goalDiff})`;
    if (winRatePercent >= 50 && goalDiff >= 0) return `Good (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
    if (winRatePercent >= 40 && goalDiff >= -5) return `Average (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
    if (winRatePercent <= 30 && goalDiff <= -10) return `Terrible (${winRatePercent.toFixed(0)}%/${goalDiff})`;
    return `Poor (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
  }
}

/**
 * Options for tier-based team balance algorithm
 */
export interface TierBasedOptions {
  /** IDs of players designated as permanent goalkeepers */
  permanentGKIds?: string[];
  /** Pre-fetched chemistry lookup data for balancing intra-team chemistry */
  chemistryLookup?: Map<string, number>;
}

/**
 * Main function: Find optimal team balance using tier-based snake draft
 */
export function findTierBasedTeamBalance(
  players: TeamAssignment[],
  options: TierBasedOptions = {}
): TierBasedResult {
  const { permanentGKIds = [], chemistryLookup } = options;
  const startTime = Date.now();
  let debugLog = '═══════════════════════════════════════════════════════════════════════════════\n';
  debugLog += '                    TIER-BASED SNAKE DRAFT DEBUG LOG\n';
  debugLog += '═══════════════════════════════════════════════════════════════════════════════\n\n';

  // Algorithm Configuration Header
  debugLog += '📋 ALGORITHM CONFIGURATION\n';
  debugLog += '─────────────────────────────────────────────────────────────────────────────\n';
  debugLog += `Timestamp: ${new Date().toISOString()}\n`;
  debugLog += `Input: ${players.length} players, ${permanentGKIds.length} permanent GK(s)\n\n`;

  debugLog += '🔧 WEIGHTS & PARAMETERS:\n';
  debugLog += `  • Skill Weight: ${(WEIGHT_SKILL * 100).toFixed(0)}% (Attack/Defense/Game IQ/GK)\n`;
  debugLog += `  • Attributes Weight: ${(WEIGHT_ATTRIBUTES * 100).toFixed(0)}% (Derived from playstyles)\n`;
  debugLog += `  • Overall Performance: ${(WEIGHT_OVERALL * 100).toFixed(0)}% (Career stats)\n`;
  debugLog += `  • Recent Form: ${(WEIGHT_RECENT * 100).toFixed(0)}% (Last 10 games)\n`;
  debugLog += `  • Balance Threshold: ${BALANCE_THRESHOLD}\n\n`;

  debugLog += '🌡️ SIMULATED ANNEALING (SA):\n';
  debugLog += '  • Initial Temperature: 1.0 (high exploration)\n';
  debugLog += '  • Cooling Rate: 0.90 (10% reduction per round)\n';
  debugLog += '  • Min Temperature: 0.01 (stop condition)\n';
  debugLog += '  • Reheat Threshold: 3 rounds without improvement\n';
  debugLog += '  • Reheat Temperature: 0.40\n\n';

  debugLog += '⚖️ SYSTEMATIC BIAS AWARENESS:\n';
  debugLog += '  • Active during draft: Prevents one team from winning all metrics\n';
  debugLog += '  • Bias threshold: 0.2 (triggers override when significant)\n';
  debugLog += '  • Goal: Achieve 2-2 metric split (Blue/Orange each win 2 skills)\n\n';

  debugLog += '🔄 SOFT PENALTY SYSTEM:\n';
  debugLog += `  • Minor violation (1.0-1.5x threshold): ${(SOFT_PENALTY_CONFIG.MINOR_PENALTY * 100).toFixed(0)}% penalty\n`;
  debugLog += `  • Moderate violation (1.5-2.0x): ${(SOFT_PENALTY_CONFIG.MODERATE_PENALTY * 100).toFixed(0)}% penalty\n`;
  debugLog += `  • Severe violation (2.0-2.5x): ${(SOFT_PENALTY_CONFIG.SEVERE_PENALTY * 100).toFixed(0)}% penalty\n`;
  debugLog += `  • Catastrophic (>2.5x): HARD REJECT\n\n`;

  debugLog += '🤝 CHEMISTRY BALANCE (Dec 2025):\n';
  debugLog += `  • Weight: ${(DEFAULT_WEIGHTS.chemistryBalance * 100).toFixed(0)}% of overall score\n`;
  debugLog += `  • Chemistry pairs loaded: ${chemistryLookup?.size ?? 0}\n`;
  debugLog += `  • Default score for unknown pairs: ${CHEMISTRY_CONFIG.DEFAULT_SCORE}\n`;
  debugLog += `  • High chemistry threshold: ${CHEMISTRY_CONFIG.HIGH_CHEMISTRY_THRESHOLD}\n`;
  if (!chemistryLookup || chemistryLookup.size === 0) {
    debugLog += '  • Status: No chemistry data - chemistry balance will be neutral\n';
  }
  debugLog += '\n';

  debugLog += '─────────────────────────────────────────────────────────────────────────────\n\n';

  // Add permanent GK section to debug log if any are selected
  if (permanentGKIds.length > 0) {
    debugLog += '⚠️  PERMANENT GOALKEEPERS SELECTED\n';
    debugLog += '═══════════════════════════════════════\n';
    debugLog += `${permanentGKIds.length} player(s) designated as permanent goalkeepers\n`;
    debugLog += 'These players will be distributed evenly before standard team balancing\n';
    debugLog += 'and will not be involved in optimization swaps.\n\n';
  }
  
  // Add Executive Summary placeholder - will be filled after processing
  let executiveSummaryData = {
    totalPlayers: players.length,
    ratedPlayers: 0,
    newPlayers: 0,
    tierCount: 0,
    tierSizes: '',
    finalBalance: 0,
    balanceQuality: '',
    optimizationSwaps: 0,
    teamStrengthAdvantage: ''
  };
  
  // We'll insert the executive summary here after we have all the data
  const executiveSummaryPlaceholder = '[[EXECUTIVE_SUMMARY]]';
  debugLog += executiveSummaryPlaceholder + '\n\n';
  
  // Add performance categories legend
  debugLog += 'PERFORMANCE CATEGORIES\n';
  debugLog += '=====================\n';
  debugLog += 'Overall Performance:\n';
  debugLog += '  Excellent: 55%+ win rate AND positive goal diff\n';
  debugLog += '  Strong: 55%+ win rate OR +15 goal diff\n';
  debugLog += '  Good: 50-54% win rate OR positive goal diff\n';
  debugLog += '  Average: 45-49% win rate, small goal diff (±5)\n';
  debugLog += '  Poor: 40-44% win rate OR negative goal diff\n';
  debugLog += '  Terrible: <40% win rate AND negative goal diff\n';
  debugLog += '\nRecent Form:\n';
  debugLog += '  Excellent: 60%+ win rate AND +10 goal diff\n';
  debugLog += '  Good: 50%+ win rate OR positive goal diff\n';
  debugLog += '  Average: 40-49% win rate, small goal diff (±5)\n';
  debugLog += '  Poor: 30-39% win rate OR negative goal diff\n';
  debugLog += '  Terrible: <30% win rate AND -10 goal diff\n';
  debugLog += '\nMomentum Indicators:\n';
  debugLog += '  🔥 Hot Streak: Recent form significantly better than overall\n';
  debugLog += '  ❄️ Cold Streak: Recent form significantly worse than overall\n';
  debugLog += '  ● Steady: Recent form similar to overall performance\n\n';
  
  // Step 1: Calculate three-layer ratings for all players
  debugLog += 'STEP 1: CALCULATING THREE-LAYER RATINGS\n';
  debugLog += '=====================================\n\n';

  // Calculate league attribute statistics for relative comparisons
  const attributeStats = calculateLeagueAttributeStats(players);
  debugLog += `League Attribute Stats: avg=${attributeStats.average.toFixed(2)}, std=${attributeStats.standardDeviation.toFixed(2)}, range=${attributeStats.min.toFixed(2)}-${attributeStats.max.toFixed(2)}\n\n`;

  // Calculate goal differential statistics from actual player pool
  const goalDiffStats = calculateGoalDiffStats(players);
  debugLog += `Goal Diff Stats: Overall range=${goalDiffStats.overallMin} to ${goalDiffStats.overallMax}, Recent range=${goalDiffStats.recentMin} to ${goalDiffStats.recentMax}\n\n`;

  const playersWithRatings: PlayerWithRating[] = players.map(player => {
    const ratingInfo = calculateThreeLayerRating(player, attributeStats, goalDiffStats);
    
    // Track rated vs new players for executive summary
    if (player.total_games && player.total_games >= MIN_GAMES_FOR_STATS) {
      executiveSummaryData.ratedPlayers++;
    } else {
      executiveSummaryData.newPlayers++;
    }
    
    debugLog += `Player: ${player.friendly_name}\n`;
    debugLog += `  Base Skill: Attack=${player.attack_rating ?? 5}, Defense=${player.defense_rating ?? 5}, Game IQ=${player.game_iq_rating ?? 5}\n`;
    debugLog += `  Base Skill Rating: ${ratingInfo.baseSkillRating.toFixed(2)}\n`;
    
    // Add derived attributes logging
    if (player.derived_attributes && ratingInfo.attributesScore && ratingInfo.attributesScore > 0) {
      const attrs = player.derived_attributes;
      debugLog += `  Derived Attributes: PAC=${attrs.pace.toFixed(2)}, SHO=${attrs.shooting.toFixed(2)}, PAS=${attrs.passing.toFixed(2)}, DRI=${attrs.dribbling.toFixed(2)}, DEF=${attrs.defending.toFixed(2)}, PHY=${attrs.physical.toFixed(2)}\n`;
      debugLog += `  Attributes Score: ${ratingInfo.attributesScore.toFixed(2)} (avg ${(ratingInfo.attributesScore / 10).toFixed(3)} × 10)\n`;
      debugLog += `  Attributes Adjustment: ${ratingInfo.attributesAdjustment ? (ratingInfo.attributesAdjustment > 0 ? '+' : '') + ratingInfo.attributesAdjustment.toFixed(3) : '0.000'} (${(WEIGHT_ATTRIBUTES * 100).toFixed(0)}% weight)\n`;
    } else {
      debugLog += `  Derived Attributes: None (no playstyle ratings)\n`;
    }
    
    debugLog += `  Total Games: ${player.total_games ?? 0}\n`;
    
    if (player.total_games && player.total_games >= 10) {
      // Format win rates consistently as percentages
      const overallWR = player.overall_win_rate ?? 0;
      const recentWR = player.win_rate ?? 0;
      const overallWRDisplay = (overallWR > 1 ? overallWR : overallWR * 100).toFixed(2);
      const recentWRDisplay = (recentWR > 1 ? recentWR : recentWR * 100).toFixed(2);
      
      debugLog += `  Overall Stats: Win Rate=${overallWRDisplay}%, Goal Diff=${player.overall_goal_differential ?? 0}\n`;
      debugLog += `  Recent Stats: Win Rate=${recentWRDisplay}%, Goal Diff=${player.goal_differential ?? 0}\n`;
      debugLog += `  Overall Performance Score: ${ratingInfo.overallPerformanceScore?.toFixed(3) ?? 'N/A'}\n`;
      debugLog += `  Recent Form Score: ${ratingInfo.recentFormScore?.toFixed(3) ?? 'N/A'}\n`;
      debugLog += `  Momentum: ${ratingInfo.momentumScore?.toFixed(3) ?? 'N/A'} (${ratingInfo.momentumCategory ?? 'steady'})\n`;
      debugLog += `  Momentum Adjustment: ${ratingInfo.momentumAdjustment?.toFixed(3) ?? 'N/A'}\n`;
      debugLog += `  Three-Layer Rating: ${ratingInfo.threeLayerRating.toFixed(2)} (adjusted from ${ratingInfo.baseSkillRating.toFixed(2)})\n`;
    } else {
      debugLog += `  Three-Layer Rating: ${ratingInfo.threeLayerRating.toFixed(2)} (skill only - less than 10 games)\n`;
    }
    debugLog += '\n';
    
    return {
      ...player,
      ...ratingInfo
    };
  });
  
  // Create player transformation table
  debugLog += '\nPLAYER TRANSFORMATION TABLE\n';
  debugLog += '==========================\n';
  debugLog += 'Shows how three-layer system transforms player ratings based on performance\n\n';
  
  // Sort by base skill for transformation comparison
  const transformationData = [...playersWithRatings].sort((a, b) => b.baseSkillRating - a.baseSkillRating);
  
  // Option 1: Detailed Table Format
  debugLog += 'Player       | Base  | Overall Performance    | Recent Form        | Momentum | Final | Change\n';
  debugLog += '-------------|-------|----------------------|-------------------|----------|-------|--------\n';
  
  transformationData.forEach(player => {
    const change = player.threeLayerRating - player.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    if (player.total_games && player.total_games >= 10) {
      const overallWR = player.overall_win_rate ?? 50;
      const overallGD = player.overall_goal_differential ?? 0;
      const recentWR = player.win_rate ?? 50;
      const recentGD = player.goal_differential ?? 0;
      
      const overallPerf = formatPerformanceDescription(overallWR, overallGD, true);
      const recentPerf = formatPerformanceDescription(recentWR, recentGD, false);
      
      // Format momentum indicator
      const momentumScore = player.momentumScore ?? 0;
      const momentumCategory = player.momentumCategory ?? 'steady';
      const momentumDisplay = `${momentumScore.toFixed(2)} (${momentumCategory})`;
      
      debugLog += `${player.friendly_name.padEnd(12)} | ${player.baseSkillRating.toFixed(2).padStart(5)} | ${overallPerf.padEnd(20)} | ${recentPerf.padEnd(17)} | ${momentumDisplay.padEnd(8)} | ${player.threeLayerRating.toFixed(2).padStart(5)} | ${changeStr}\n`;
    } else {
      debugLog += `${player.friendly_name.padEnd(12)} | ${player.baseSkillRating.toFixed(2).padStart(5)} | N/A (<10 games)      | N/A               | N/A      | ${player.threeLayerRating.toFixed(2).padStart(5)} | ${changeStr}\n`;
    }
  });
  
  // Option 2: Compact Summary Format (as requested)
  debugLog += '\n\nCOMPACT TRANSFORMATION SUMMARY\n';
  debugLog += '==============================\n';
  debugLog += 'Player | Base Skill | Overall W% | Overall GD | Recent W% | Recent GD | Momentum | Final Rating | Change\n';
  debugLog += '-------|------------|------------|------------|-----------|-----------|----------|--------------|--------\n';
  
  transformationData.forEach(player => {
    const change = player.threeLayerRating - player.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    if (player.total_games && player.total_games >= 10) {
      const overallWR = player.overall_win_rate ?? 50;
      const overallGD = player.overall_goal_differential ?? 0;
      const recentWR = player.win_rate ?? 50;
      const recentGD = player.goal_differential ?? 0;
      
      const owrStr = (overallWR > 1 ? overallWR : overallWR * 100).toFixed(0) + '%';
      const rwrStr = (recentWR > 1 ? recentWR : recentWR * 100).toFixed(0) + '%';
      const ogdStr = overallGD >= 0 ? `+${overallGD}` : `${overallGD}`;
      const rgdStr = recentGD >= 0 ? `+${recentGD}` : `${recentGD}`;
      
      // Format momentum for compact display
      const momentumScore = player.momentumScore ?? 0;
      const momentumCategory = player.momentumCategory ?? 'steady';
      const momentumStr = `${momentumScore.toFixed(2)}${momentumCategory === 'hot' ? '🔥' : momentumCategory === 'cold' ? '❄️' : '●'}`;
      
      debugLog += `${player.friendly_name.padEnd(7)}| ${player.baseSkillRating.toFixed(2).padStart(10)} | ${owrStr.padStart(10)} | ${ogdStr.padStart(10)} | ${rwrStr.padStart(9)} | ${rgdStr.padStart(9)} | ${momentumStr.padStart(8)} | ${player.threeLayerRating.toFixed(2).padStart(12)} | ${changeStr}\n`;
    } else {
      debugLog += `${player.friendly_name.padEnd(7)}| ${player.baseSkillRating.toFixed(2).padStart(10)} | N/A        | N/A        | N/A       | N/A       | N/A      | ${player.threeLayerRating.toFixed(2).padStart(12)} | ${changeStr}\n`;
    }
  });
  
  // Add key insights
  debugLog += '\nKEY INSIGHTS:\n';
  debugLog += '============\n';
  
  // Performance Transformation Analysis
  debugLog += '\nPERFORMANCE-BASED TRANSFORMATIONS:\n';
  
  // Find players with significant drops (> 0.5 points with conservative weights)
  const majorDrops = transformationData.filter(p => p.baseSkillRating - p.threeLayerRating > 0.5);
  if (majorDrops.length > 0) {
    debugLog += 'Major Rating Drops:\n';
    majorDrops.forEach(p => {
      const drop = p.baseSkillRating - p.threeLayerRating;
      let reason = 'poor performance';
      
      if (p.total_games && p.total_games >= 10) {
        const overallWR = p.overall_win_rate ?? 50;
        const recentWR = p.win_rate ?? 50;
        const overallGD = p.overall_goal_differential ?? 0;
        const recentGD = p.goal_differential ?? 0;
        
        if ((overallWR < 0.40 || overallWR < 40) && (recentWR < 0.30 || recentWR < 30)) {
          reason = 'consistently poor performance (overall & recent)';
        } else if (recentWR < 0.30 || recentWR < 30) {
          reason = `terrible recent form (${(recentWR > 1 ? recentWR : recentWR * 100).toFixed(0)}% win rate)`;
        } else if (overallWR < 0.40 || overallWR < 40) {
          reason = `weak career record (${(overallWR > 1 ? overallWR : overallWR * 100).toFixed(0)}% win rate)`;
        } else if (overallGD < -10 && recentGD < -10) {
          reason = `persistent goal differential issues (${overallGD}/${recentGD})`;
        }
      }
      
      debugLog += `  - ${p.friendly_name}: ${p.baseSkillRating.toFixed(2)} → ${p.threeLayerRating.toFixed(2)} (-${drop.toFixed(2)}) - ${reason}\n`;
    });
  }
  
  // Find players with significant gains (> 0.3 points with conservative weights)
  const majorGains = transformationData.filter(p => p.threeLayerRating - p.baseSkillRating > 0.3);
  if (majorGains.length > 0) {
    debugLog += '\nMajor Rating Boosts:\n';
    majorGains.forEach(p => {
      const gain = p.threeLayerRating - p.baseSkillRating;
      let reason = 'strong performance';
      
      if (p.total_games && p.total_games >= 10) {
        const overallWR = p.overall_win_rate ?? 50;
        const recentWR = p.win_rate ?? 50;
        const overallGD = p.overall_goal_differential ?? 0;
        const recentGD = p.goal_differential ?? 0;
        
        if ((overallWR > 0.55 || overallWR > 55) && (recentWR > 0.60 || recentWR > 60)) {
          reason = `consistently excellent (${(overallWR > 1 ? overallWR : overallWR * 100).toFixed(0)}%/${(recentWR > 1 ? recentWR : recentWR * 100).toFixed(0)}% win rates)`;
        } else if (recentWR > 0.60 || recentWR > 60) {
          reason = `hot streak (${(recentWR > 1 ? recentWR : recentWR * 100).toFixed(0)}% recent win rate)`;
        } else if (overallWR > 0.55 || overallWR > 55) {
          reason = `proven winner (${(overallWR > 1 ? overallWR : overallWR * 100).toFixed(0)}% career win rate)`;
        } else if (overallGD > 20 || recentGD > 15) {
          reason = `dominant goal differential (+${Math.max(overallGD, recentGD)})`;
        }
      }
      
      debugLog += `  - ${p.friendly_name}: ${p.baseSkillRating.toFixed(2)} → ${p.threeLayerRating.toFixed(2)} (+${gain.toFixed(2)}) - ${reason}\n`;
    });
  }
  
  // Momentum Analysis
  debugLog += '\nMOMENTUM ANALYSIS:\n';
  const hotStreaks = transformationData.filter(p => p.momentumCategory === 'hot');
  const coldStreaks = transformationData.filter(p => p.momentumCategory === 'cold');
  const steadyPlayers = transformationData.filter(p => p.momentumCategory === 'steady' && p.total_games && p.total_games >= 10);
  
  if (hotStreaks.length > 0) {
    debugLog += 'Hot Streaks 🔥:\n';
    hotStreaks.forEach(p => {
      const recentWR = p.win_rate ?? 50;
      const overallWR = p.overall_win_rate ?? 50;
      const improvement = (recentWR > 1 ? recentWR : recentWR * 100) - (overallWR > 1 ? overallWR : overallWR * 100);
      debugLog += `  - ${p.friendly_name}: +${improvement.toFixed(0)}% win rate improvement (momentum: ${p.momentumScore?.toFixed(2)})\n`;
    });
  }
  
  if (coldStreaks.length > 0) {
    debugLog += 'Cold Streaks ❄️:\n';
    coldStreaks.forEach(p => {
      const recentWR = p.win_rate ?? 50;
      const overallWR = p.overall_win_rate ?? 50;
      const decline = (overallWR > 1 ? overallWR : overallWR * 100) - (recentWR > 1 ? recentWR : recentWR * 100);
      debugLog += `  - ${p.friendly_name}: -${decline.toFixed(0)}% win rate decline (momentum: ${p.momentumScore?.toFixed(2)})\n`;
    });
  }
  
  // Tier Movement Analysis
  debugLog += '\nTIER PLACEMENT ANALYSIS:\n';
  
  // Find players who moved tiers due to transformation
  const originalTiers = [...playersWithRatings].sort((a, b) => b.baseSkillRating - a.baseSkillRating);
  const finalTiers = [...playersWithRatings].sort((a, b) => b.threeLayerRating - a.threeLayerRating);
  
  const tierChanges: Array<{player: PlayerWithRating, originalPos: number, finalPos: number}> = [];
  originalTiers.forEach((player, originalIndex) => {
    const finalIndex = finalTiers.findIndex(p => p.friendly_name === player.friendly_name);
    if (Math.abs(finalIndex - originalIndex) >= 3) {
      tierChanges.push({ player, originalPos: originalIndex + 1, finalPos: finalIndex + 1 });
    }
  });
  
  if (tierChanges.length > 0) {
    debugLog += 'Significant Position Changes:\n';
    tierChanges.forEach(({ player, originalPos, finalPos }) => {
      const movement = originalPos - finalPos;
      const direction = movement > 0 ? '↑' : '↓';
      debugLog += `  - ${player.friendly_name}: ${originalPos} → ${finalPos} (${direction}${Math.abs(movement)} positions)\n`;
    });
  }
  
  // Elite vs Performance Mismatch
  debugLog += '\nSKILL VS PERFORMANCE MISMATCHES:\n';
  const eliteSkillPoorForm = transformationData.filter(p => 
    p.baseSkillRating > 7.5 && p.threeLayerRating - p.baseSkillRating < -0.3
  );
  if (eliteSkillPoorForm.length > 0) {
    eliteSkillPoorForm.forEach(p => {
      const perf = p.overall_win_rate ?? 50;
      const perfStr = (perf > 1 ? perf : perf * 100).toFixed(0);
      debugLog += `  - ${p.friendly_name}: Elite skills (${p.baseSkillRating.toFixed(2)}) but only ${perfStr}% win rate\n`;
    });
  }
  
  const lowSkillGoodForm = transformationData.filter(p => 
    p.baseSkillRating < 5.5 && p.threeLayerRating - p.baseSkillRating > 0.2
  );
  if (lowSkillGoodForm.length > 0) {
    lowSkillGoodForm.forEach(p => {
      const perf = p.overall_win_rate ?? 50;
      const perfStr = (perf > 1 ? perf : perf * 100).toFixed(0);
      debugLog += `  - ${p.friendly_name}: Modest skills (${p.baseSkillRating.toFixed(2)}) but ${perfStr}% win rate performance\n`;
    });
  }
  
  // Final Rankings Summary
  debugLog += '\nFINAL RANKINGS SUMMARY:\n';
  // Use the already sorted finalTiers array to get correct top/bottom players
  const topThree = finalTiers.slice(0, 3);
  const bottomThree = finalTiers.slice(-3);
  
  debugLog += 'Top 3 After Transformation:\n';
  topThree.forEach((p, i) => {
    const change = p.threeLayerRating - p.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    debugLog += `  ${i + 1}. ${p.friendly_name}: ${p.threeLayerRating.toFixed(2)} (base: ${p.baseSkillRating.toFixed(2)}, ${changeStr})\n`;
  });
  
  debugLog += 'Bottom 3 After Transformation:\n';
  bottomThree.forEach((p, i) => {
    const change = p.threeLayerRating - p.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    debugLog += `  ${players.length - 2 + i}. ${p.friendly_name}: ${p.threeLayerRating.toFixed(2)} (base: ${p.baseSkillRating.toFixed(2)}, ${changeStr})\n`;
  });
  
  // Add Playstyle Distribution Table
  debugLog += '\nPLAYSTYLE DISTRIBUTION\n';
  debugLog += '======================\n';
  
  const playersWithPlaystyles = playersWithRatings.filter(p => p.hasPlaystyleRating);
  const playstyleCoverage = (playersWithPlaystyles.length / players.length * 100).toFixed(0);
  debugLog += `Playstyle Coverage: ${playstyleCoverage}% (${playersWithPlaystyles.length}/${players.length} players rated)\n\n`;
  
  debugLog += 'Player            | Has Playstyle | Top Attributes\n';
  debugLog += '------------------|---------------|------------------------------\n';
  
  playersWithRatings.forEach(player => {
    const nameCol = player.friendly_name.padEnd(16).substring(0, 16);
    const hasPlaystyle = player.hasPlaystyleRating ? 'Yes' : 'No ';
    
    let topAttrs = '-';
    if (player.derived_attributes && player.hasPlaystyleRating) {
      const attrs = player.derived_attributes;
      const attrArray = [
        { name: 'PAC', value: attrs.pace },
        { name: 'SHO', value: attrs.shooting },
        { name: 'PAS', value: attrs.passing },
        { name: 'DRI', value: attrs.dribbling },
        { name: 'DEF', value: attrs.defending },
        { name: 'PHY', value: attrs.physical }
      ];
      
      // Sort by value and get top 2
      attrArray.sort((a, b) => b.value - a.value);
      const topTwo = attrArray.slice(0, 2).filter(a => a.value > 0);
      
      if (topTwo.length > 0) {
        topAttrs = topTwo.map(a => `${a.name}(${a.value.toFixed(2)})`).join(', ');
      }
    }
    
    debugLog += `${nameCol} | ${hasPlaystyle}            | ${topAttrs}\n`;
  });
  
  // Algorithm Configuration
  debugLog += '\nALGORITHM CONFIGURATION:\n';
  debugLog += `  - Skill Weight: ${(WEIGHT_SKILL * 100).toFixed(0)}%\n`;
  debugLog += `  - Attributes Weight: ${(WEIGHT_ATTRIBUTES * 100).toFixed(0)}%\n`;
  debugLog += `  - Overall Performance: ${(WEIGHT_OVERALL * 100).toFixed(0)}%\n`;
  debugLog += `  - Recent Form: ${(WEIGHT_RECENT * 100).toFixed(0)}%\n`;
  debugLog += `  - Momentum Bonus/Penalty: ${(MOMENTUM_WEIGHT_HOT * 100).toFixed(0)}%/${(MOMENTUM_WEIGHT_COLD * 100).toFixed(0)}%\n`;
  
  debugLog += '\n';
  
  // Add condensed rating calculations summary
  debugLog += '\n\nRATING CALCULATIONS SUMMARY (Skill → Performance → Final)\n';
  debugLog += '=========================================================\n';
  
  // Sort by base skill for condensed display
  const sortedForCondensed = [...playersWithRatings].sort((a, b) => b.baseSkillRating - a.baseSkillRating);
  
  sortedForCondensed.forEach(player => {
    const change = player.threeLayerRating - player.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    if (player.total_games && player.total_games >= MIN_GAMES_FOR_STATS) {
      const overallWR = player.overall_win_rate ?? 50;
      const overallGD = player.overall_goal_differential ?? 0;
      const recentWR = player.win_rate ?? 50;
      
      // Performance description
      let perfDesc = '';
      const wrDisplay = (overallWR > 1 ? overallWR : overallWR * 100).toFixed(0);
      const gdDisplay = overallGD >= 0 ? `+${overallGD}` : `${overallGD}`;
      
      if ((overallWR > 0.55 || overallWR > 55) && overallGD > 10) {
        perfDesc = `Strong (${wrDisplay}%/${gdDisplay})`;
      } else if ((overallWR > 0.50 || overallWR > 50) || overallGD > 0) {
        perfDesc = `Good (${wrDisplay}%/${gdDisplay})`;
      } else if ((overallWR > 0.45 || overallWR > 45) && overallGD >= -5) {
        perfDesc = `Average (${wrDisplay}%/${gdDisplay})`;
      } else {
        perfDesc = `Poor (${wrDisplay}%/${gdDisplay})`;
      }
      
      // Momentum indicator
      let momentum = '';
      if (player.momentumCategory === 'hot') momentum = ' 🔥';
      else if (player.momentumCategory === 'cold') momentum = ' ❄️';
      
      debugLog += `${player.friendly_name.padEnd(12)}: ${player.baseSkillRating.toFixed(2)} → ${perfDesc.padEnd(22)}${momentum} → ${player.threeLayerRating.toFixed(2)} (${changeStr})\n`;
    } else {
      debugLog += `${player.friendly_name.padEnd(12)}: ${player.baseSkillRating.toFixed(2)} → New player (<10 games)     → ${player.threeLayerRating.toFixed(2)} (${changeStr})\n`;
    }
  });

  debugLog += '\n';

  // Attach primary positions for position balancing
  const playersWithPositions = attachPrimaryPositions(playersWithRatings);
  const withPositions = playersWithPositions.filter(p => p.primaryPosition);

  // Log adaptive threshold being used
  const maxRaters = Math.max(...playersWithRatings
    .filter(p => p.positions && p.positions.length > 0)
    .map(p => p.positions![0]?.total_raters || 0), 0);

  if (maxRaters > 0) {
    const adaptiveThreshold = maxRaters <= 3 ? 25 : maxRaters <= 5 ? 33 : maxRaters <= 8 ? 40 : 50;
    debugLog += `Position Classification: Using adaptive ${adaptiveThreshold}% threshold (${maxRaters} max raters)\n`;
  }

  debugLog += `Position Data: ${withPositions.length}/${playersWithPositions.length} players have position ratings\n`;

  if (withPositions.length > 0) {
    // Show position distribution
    const positionCounts: Record<string, number> = {};
    withPositions.forEach(p => {
      const pos = p.primaryPosition!;
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });

    debugLog += `Position Distribution: ${Object.entries(positionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([pos, count]) => `${count}×${pos}`)
      .join(', ')}\n`;
  }
  debugLog += '\n';

  // Step 2: Sort players by three-layer rating (descending)
  playersWithPositions.sort((a, b) => b.threeLayerRating - a.threeLayerRating);
  
  debugLog += '\nSTEP 2: SORTED BY THREE-LAYER RATING\n';
  debugLog += '=====================================\n';
  playersWithPositions.forEach((player, index) => {
    debugLog += `${index + 1}. ${player.friendly_name}: ${player.threeLayerRating.toFixed(2)}\n`;
  });

  // Phase 0: Permanent GK Assignment (if any)
  let permanentGKsBlue: PlayerWithRating[] = [];
  let permanentGKsOrange: PlayerWithRating[] = [];
  let regularPlayers = [...playersWithPositions];

  if (permanentGKIds.length > 0) {
    debugLog += '\n🥅 PHASE 0: PERMANENT GOALKEEPER ASSIGNMENT\n';
    debugLog += '==========================================\n';

    // Separate permanent GKs from regular players
    const permanentGKPlayers = playersWithPositions.filter(p => permanentGKIds.includes(p.player_id));
    regularPlayers = playersWithPositions.filter(p => !permanentGKIds.includes(p.player_id));

    // Calculate permanent GK ratings and sort by rating
    const permanentGKsWithRatings = permanentGKPlayers.map(player => {
      const gkRatingInfo = calculatePermanentGKRating(player, goalDiffStats);
      debugLog += `\n${player.friendly_name} (Permanent GK):\n`;
      debugLog += `  GK Rating: ${player.gk_rating ?? 5}\n`;
      debugLog += `  Game IQ: ${player.game_iq_rating ?? 5}\n`;
      if (player.total_games && player.total_games >= 10) {
        debugLog += `  Overall Performance: ${gkRatingInfo.overallPerformanceScore?.toFixed(3) ?? 'N/A'}\n`;
        debugLog += `  Recent Form: ${gkRatingInfo.recentFormScore?.toFixed(3) ?? 'N/A'}\n`;
      }
      debugLog += `  Permanent GK Rating: ${gkRatingInfo.threeLayerRating.toFixed(2)}\n`;
      return {
        ...player,
        ...gkRatingInfo,
        isPermanentGK: true
      };
    }).sort((a, b) => b.threeLayerRating - a.threeLayerRating);

    // Distribute permanent GKs evenly (alternating, starting with highest rated)
    debugLog += '\nDistribution:\n';
    permanentGKsWithRatings.forEach((gk, index) => {
      if (index % 2 === 0) {
        permanentGKsBlue.push(gk);
        debugLog += `  🔵 Blue Team: ${gk.friendly_name} (Rating: ${gk.threeLayerRating.toFixed(2)})\n`;
      } else {
        permanentGKsOrange.push(gk);
        debugLog += `  🟠 Orange Team: ${gk.friendly_name} (Rating: ${gk.threeLayerRating.toFixed(2)})\n`;
      }
    });

    debugLog += `\nPermanent GKs Distributed: ${permanentGKsBlue.length} Blue, ${permanentGKsOrange.length} Orange\n`;
    debugLog += `Remaining Players for Standard Balancing: ${regularPlayers.length}\n`;

    // VALIDATION: Ensure no permanent GKs leaked into regularPlayers
    const permanentGKInRegular = regularPlayers.filter(p => permanentGKIds.includes(p.player_id));
    if (permanentGKInRegular.length > 0) {
      const bugDetails = permanentGKInRegular.map(p => `${p.friendly_name} (ID: ${p.player_id})`).join(', ');
      debugLog += `\n❌ BUG DETECTED: Permanent GKs found in regularPlayers: ${bugDetails}\n`;
      debugLog += `This should never happen! Permanent GKs must be filtered out before tier creation.\n\n`;
      throw new Error(`CRITICAL BUG: Permanent GKs found in regularPlayers: ${bugDetails}`);
    }
    debugLog += `\n✅ Validation Passed: Confirmed 0 permanent GKs in regular players\n`;

    // Debug logging for troubleshooting
    debugLog += `\nDEBUG INFO:\n`;
    debugLog += `  permanentGKIds array: [${permanentGKIds.join(', ')}]\n`;
    debugLog += `  regularPlayers (first 5): [${regularPlayers.slice(0, 5).map(p => `${p.friendly_name}(${p.player_id})`).join(', ')}]\n`;
    debugLog += `  Total playersWithPositions: ${playersWithPositions.length}\n`;
    debugLog += `  Total regularPlayers: ${regularPlayers.length}\n`;
    debugLog += `  Total permanent GKs: ${permanentGKsBlue.length + permanentGKsOrange.length}\n`;
  }

  // Step 3: Create tiers (using only regular players)
  const tierSizes = calculateTierSizes(regularPlayers.length);
  executiveSummaryData.tierCount = tierSizes.length;
  executiveSummaryData.tierSizes = tierSizes.join('-');

  debugLog += `\nSTEP 3: CREATING TIERS (REGULAR PLAYERS ONLY)\n`;
  debugLog += '================================================\n';
  debugLog += `Regular Players for Tiering: ${regularPlayers.length}\n`;
  if (permanentGKIds.length > 0) {
    debugLog += `Permanent GKs (excluded from tiers): ${permanentGKsBlue.length + permanentGKsOrange.length}\n`;
  }
  debugLog += `Tier Sizes: ${tierSizes.join(', ')}\n\n`;

  const tiers: TierInfo[] = [];
  let playerIndex = 0;

  tierSizes.forEach((size, tierIndex) => {
    const tierPlayers = regularPlayers.slice(playerIndex, playerIndex + size);
    
    // Assign tier number to each player
    tierPlayers.forEach(p => p.tier = tierIndex + 1);
    
    const skillRange = {
      min: Math.min(...tierPlayers.map(p => p.threeLayerRating)),
      max: Math.max(...tierPlayers.map(p => p.threeLayerRating))
    };
    
    tiers.push({
      tierNumber: tierIndex + 1,
      players: tierPlayers,
      skillRange
    });
    
    debugLog += `Tier ${tierIndex + 1} (${size} players, range: ${skillRange.min.toFixed(2)}-${skillRange.max.toFixed(2)}):\n`;
    tierPlayers.forEach(player => {
      debugLog += `  - ${player.friendly_name} (${player.threeLayerRating.toFixed(2)})\n`;
    });
    debugLog += '\n';
    
    playerIndex += size;
  });
  
  // Step 4: Apply snake draft
  const debugLogRef = { value: debugLog };
  const { blueTeam: initialBlueTeam, orangeTeam: initialOrangeTeam } = applySnakeDraft(tiers, permanentGKIds, debugLogRef);
  debugLog = debugLogRef.value;
  
  // Add visual snake draft representation
  debugLog += '\nSNAKE DRAFT VISUALIZATION\n';
  debugLog += '========================\n';
  
  let pickNumber = 0;
  // Determine which team picked first based on the actual draft results
  let bluePicksFirstInVisualization = initialBlueTeam.some(p => p.tier === 1 && tiers[0]?.players[0]?.player_id === p.player_id);
  tiers.forEach((tier, tierIndex) => {
    const players = tier.players;
    
    // Create the visual representation for this tier
    const picks: string[] = [];
    for (let i = 0; i < players.length; i++) {
      pickNumber++;
      const player = players[i];
      const team = bluePicksFirstInVisualization ? (i % 2 === 0 ? 'B' : 'O') : (i % 2 === 0 ? 'O' : 'B');
      picks.push(`${player.friendly_name}(${team})`);
    }
    
    // Format the round with proper arrows and flow
    if (tierIndex === 0) {
      // First round
      debugLog += `Tier ${tierIndex + 1}: → ${picks.join(' → ')}`;
    } else if (tierIndex % 2 === 0) {
      // Even tiers (after first) - left to right with turn indicator
      debugLog += `        ↓\n`;
      debugLog += `Tier ${tierIndex + 1}: → ${picks.join(' → ')}`;
    } else {
      // Odd tiers - right to left with turn indicator
      debugLog += ` ↘\n`;
      debugLog += `Tier ${tierIndex + 1}: ${picks.reverse().join(' ← ')} ←`;
    }
    
    // Always alternate which team picks first for next tier (true snake draft)
    bluePicksFirstInVisualization = !bluePicksFirstInVisualization;
  });
  debugLog += '\n\n';
  
  // Step 5: Calculate initial balance score
  const initialScore = calculateTierBalanceScore(initialBlueTeam, initialOrangeTeam, permanentGKIds);
  
  debugLog += 'STEP 5: INITIAL BALANCE SCORE\n';
  debugLog += '============================\n';
  debugLog += `Balance Score: ${initialScore.toFixed(3)}\n`;
  debugLog += `Blue Team Averages:\n`;
  debugLog += `  Attack: ${(initialBlueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialBlueTeam.length).toFixed(2)}\n`;
  debugLog += `  Defense: ${(initialBlueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialBlueTeam.length).toFixed(2)}\n`;
  debugLog += `  Game IQ: ${(initialBlueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialBlueTeam.length).toFixed(2)}\n`;
  debugLog += `Orange Team Averages:\n`;
  debugLog += `  Attack: ${(initialOrangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialOrangeTeam.length).toFixed(2)}\n`;
  debugLog += `  Defense: ${(initialOrangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialOrangeTeam.length).toFixed(2)}\n`;
  debugLog += `  Game IQ: ${(initialOrangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialOrangeTeam.length).toFixed(2)}\n\n`;
  
  // Step 6: Optimize if needed
  // Calculate team size and rating range for dynamic threshold
  const teamSize = Math.floor(playersWithPositions.length / 2);
  const allRatings = playersWithPositions.map(p => p.threeLayerRating);
  const ratingRange = {
    min: Math.min(...allRatings),
    max: Math.max(...allRatings)
  };
  
  let { blueTeam, orangeTeam, finalScore, wasOptimized, swapCount, swapDetails } = optimizeTeams(
    initialBlueTeam,
    initialOrangeTeam,
    teamSize,
    ratingRange,
    permanentGKIds,
    debugLogRef
  );
  debugLog = debugLogRef.value;
  executiveSummaryData.optimizationSwaps = swapCount;
  executiveSummaryData.finalBalance = finalScore;

  // Add permanent GKs back to teams
  if (permanentGKsBlue.length > 0 || permanentGKsOrange.length > 0) {
    debugLog += '\n🥅 ADDING PERMANENT GOALKEEPERS TO FINAL TEAMS\n';
    debugLog += '============================================\n';
    blueTeam = [...blueTeam, ...permanentGKsBlue];
    orangeTeam = [...orangeTeam, ...permanentGKsOrange];
    debugLog += `Blue Team: Added ${permanentGKsBlue.length} permanent GK(s)\n`;
    debugLog += `Orange Team: Added ${permanentGKsOrange.length} permanent GK(s)\n`;
    permanentGKsBlue.forEach(gk => {
      debugLog += `  🔵 ${gk.friendly_name} (GK Rating: ${gk.gk_rating ?? 5}, Overall: ${gk.threeLayerRating.toFixed(2)})\n`;
    });
    permanentGKsOrange.forEach(gk => {
      debugLog += `  🟠 ${gk.friendly_name} (GK Rating: ${gk.gk_rating ?? 5}, Overall: ${gk.threeLayerRating.toFixed(2)})\n`;
    });
  }

  // Step 7: Calculate confidence
  const confidence = calculateConfidence(playersWithPositions);
  
  debugLog += 'FINAL TEAMS\n';
  debugLog += '===========\n';
  debugLog += `\nBlue Team (${blueTeam.length} players):\n`;
  blueTeam.forEach(player => {
    debugLog += `  ${player.friendly_name} (Rating: ${player.threeLayerRating.toFixed(2)}, Tier ${player.tier})\n`;
  });
  
  debugLog += `\nOrange Team (${orangeTeam.length} players):\n`;
  orangeTeam.forEach(player => {
    debugLog += `  ${player.friendly_name} (Rating: ${player.threeLayerRating.toFixed(2)}, Tier ${player.tier})\n`;
  });
  
  debugLog += `\nConfidence: ${confidence.level} (${confidence.unknownCount}/${confidence.totalCount} players have <10 games)\n`;
  
  // Calculate team averages for all metrics (needed for multiple sections)
  const blueAvgRating = blueTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueTeam.length;
  const orangeAvgRating = orangeTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeTeam.length;

  // Identify permanent goalkeepers for proper stat calculations
  const bluePermanentGKs = blueTeam.filter(p => permanentGKIds.includes(p.player_id));
  const orangePermanentGKs = orangeTeam.filter(p => permanentGKIds.includes(p.player_id));

  // Calculate outfield players (excluding permanent GKs)
  const blueOutfield = blueTeam.filter(p => !permanentGKIds.includes(p.player_id));
  const orangeOutfield = orangeTeam.filter(p => !permanentGKIds.includes(p.player_id));

  // For attack and defense: use outfield players only (or full team if no outfield players)
  const bluePlayersForOutfield = blueOutfield.length > 0 ? blueOutfield : blueTeam;
  const orangePlayersForOutfield = orangeOutfield.length > 0 ? orangeOutfield : orangeTeam;

  // Attack and Defense: EXCLUDE permanent GKs (they're in goal)
  const blueAttack = bluePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeAttack = orangePlayersForOutfield.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangePlayersForOutfield.length;
  const blueDefense = bluePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / bluePlayersForOutfield.length;
  const orangeDefense = orangePlayersForOutfield.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangePlayersForOutfield.length;

  // Game IQ: INCLUDE all players (positioning/awareness matters for everyone including GK)
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;

  // Calculate GK ratings (use permanent GK rating if applicable, otherwise team average)

  const blueGk = bluePermanentGKs.length > 0
    ? Math.max(...bluePermanentGKs.map(p => p.gk_rating ?? 5))
    : blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / blueTeam.length;

  const orangeGk = orangePermanentGKs.length > 0
    ? Math.max(...orangePermanentGKs.map(p => p.gk_rating ?? 5))
    : orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 5), 0) / orangeTeam.length;

  // Add Team Balance Breakdown
  debugLog += '\nTEAM BALANCE BREAKDOWN\n';
  debugLog += '======================\n';

  // Calculate team statistics including performance metrics
  const blueWinRate = blueTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.win_rate ?? 50) / arr.length, 0);
  const orangeWinRate = orangeTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.win_rate ?? 50) / arr.length, 0);

  const blueGoalDiff = blueTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.goal_differential ?? 0) / arr.length, 0);
  const orangeGoalDiff = orangeTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.goal_differential ?? 0) / arr.length, 0);

  // Calculate skill wins for complementary strengths display
  const blueSkillWins =
    (blueAttack > orangeAttack ? 1 : 0) +
    (blueDefense > orangeDefense ? 1 : 0) +
    (blueGameIq > orangeGameIq ? 1 : 0) +
    (blueGk > orangeGk ? 1 : 0);
  const skillDominance = Math.abs(blueSkillWins - 2.0) / 2.0;

  // Format the breakdown table
  debugLog += '                Blue    Orange   Difference\n';
  debugLog += `Attack:         ${blueAttack.toFixed(2)}    ${orangeAttack.toFixed(2)}     ${Math.abs(blueAttack - orangeAttack).toFixed(2)}\n`;
  debugLog += `Defense:        ${blueDefense.toFixed(2)}    ${orangeDefense.toFixed(2)}     ${Math.abs(blueDefense - orangeDefense).toFixed(2)}\n`;
  debugLog += `Game IQ:        ${blueGameIq.toFixed(2)}    ${orangeGameIq.toFixed(2)}     ${Math.abs(blueGameIq - orangeGameIq).toFixed(2)}\n`;
  debugLog += `GK:             ${blueGk.toFixed(2)}    ${orangeGk.toFixed(2)}     ${Math.abs(blueGk - orangeGk).toFixed(2)}\n`;

  // Add skill distribution info
  const orangeSkillWins = 4 - blueSkillWins;
  debugLog += `\nSkill Distribution: Blue wins ${blueSkillWins}/4, Orange wins ${orangeSkillWins}/4 (dominance: ${skillDominance.toFixed(2)})\n`;
  
  // Add derived attributes breakdown
  const blueAttrs = calculateTeamAttributes(blueTeam);
  const orangeAttrs = calculateTeamAttributes(orangeTeam);

  if (blueAttrs.hasAttributes || orangeAttrs.hasAttributes) {
    debugLog += '\nAttributes:\n';
    debugLog += `  Pace:         ${(blueAttrs.pace * 10).toFixed(2)}    ${(orangeAttrs.pace * 10).toFixed(2)}     ${(Math.abs(blueAttrs.pace - orangeAttrs.pace) * 10).toFixed(2)}\n`;
    debugLog += `  Shooting:     ${(blueAttrs.shooting * 10).toFixed(2)}    ${(orangeAttrs.shooting * 10).toFixed(2)}     ${(Math.abs(blueAttrs.shooting - orangeAttrs.shooting) * 10).toFixed(2)}\n`;
    debugLog += `  Passing:      ${(blueAttrs.passing * 10).toFixed(2)}    ${(orangeAttrs.passing * 10).toFixed(2)}     ${(Math.abs(blueAttrs.passing - orangeAttrs.passing) * 10).toFixed(2)}\n`;
    debugLog += `  Dribbling:    ${(blueAttrs.dribbling * 10).toFixed(2)}    ${(orangeAttrs.dribbling * 10).toFixed(2)}     ${(Math.abs(blueAttrs.dribbling - orangeAttrs.dribbling) * 10).toFixed(2)}\n`;
    debugLog += `  Defending:    ${(blueAttrs.defending * 10).toFixed(2)}    ${(orangeAttrs.defending * 10).toFixed(2)}     ${(Math.abs(blueAttrs.defending - orangeAttrs.defending) * 10).toFixed(2)}\n`;
    debugLog += `  Physical:     ${(blueAttrs.physical * 10).toFixed(2)}    ${(orangeAttrs.physical * 10).toFixed(2)}     ${(Math.abs(blueAttrs.physical - orangeAttrs.physical) * 10).toFixed(2)}\n`;

    // Calculate attribute wins for complementary strengths display
    const blueAttrWins =
      (blueAttrs.pace > orangeAttrs.pace ? 1 : 0) +
      (blueAttrs.shooting > orangeAttrs.shooting ? 1 : 0) +
      (blueAttrs.passing > orangeAttrs.passing ? 1 : 0) +
      (blueAttrs.dribbling > orangeAttrs.dribbling ? 1 : 0) +
      (blueAttrs.defending > orangeAttrs.defending ? 1 : 0) +
      (blueAttrs.physical > orangeAttrs.physical ? 1 : 0);
    const orangeAttrWins = 6 - blueAttrWins;
    const attrDominance = Math.abs(blueAttrWins - 3.0) / 3.0;

    const attributeBalance = calculateAttributeBalanceScore(blueTeam, orangeTeam);
    debugLog += `  Overall Attr Balance: ${attributeBalance.toFixed(2)} (weighted average)\n`;
    debugLog += `  Attribute Distribution: Blue wins ${blueAttrWins}/6, Orange wins ${orangeAttrWins}/6 (dominance: ${attrDominance.toFixed(2)})\n`;
  }

  // Add shooting distribution analysis
  const allPlayers = [...blueTeam, ...orangeTeam];
  const shootingDist = analyzeShootingDistribution(allPlayers);
  const shootingImbalanceScore = calculateShootingImbalance(blueTeam, orangeTeam, shootingDist);

  debugLog += '\nSHOOTING DISTRIBUTION ANALYSIS\n';
  debugLog += '==============================\n';
  debugLog += `Field Statistics:\n`;
  debugLog += `  Players with shooting ability: ${shootingDist.nonZeroCount}/${shootingDist.totalCount}\n`;
  debugLog += `  Percentiles: 50th=${shootingDist.percentiles.p50.toFixed(2)}, 75th=${shootingDist.percentiles.p75.toFixed(2)}, 90th=${shootingDist.percentiles.p90.toFixed(2)}\n`;
  debugLog += `  Non-zero mean: ${shootingDist.nonZeroMean.toFixed(2)}\n`;

  const blueProfile = getTeamShootingProfile(blueTeam, shootingDist);
  const orangeProfile = getTeamShootingProfile(orangeTeam, shootingDist);

  debugLog += `\nTeam Shooting Profiles:\n`;
  debugLog += `  Blue:   Elite=${blueProfile.elite}, Primary=${blueProfile.primary}, Secondary=${blueProfile.secondary}, None=${blueProfile.none}\n`;
  debugLog += `  Orange: Elite=${orangeProfile.elite}, Primary=${orangeProfile.primary}, Secondary=${orangeProfile.secondary}, None=${orangeProfile.none}\n`;

  // List specific shooting threats
  const blueShooters = blueTeam
    .filter(p => categorizeShootingThreat(p, shootingDist) !== 'none')
    .map(p => {
      const category = categorizeShootingThreat(p, shootingDist);
      const shooting = p.derived_attributes?.shooting || 0;
      return `${p.friendly_name}(${shooting.toFixed(2)}-${category[0].toUpperCase()})`;
    });

  const orangeShooters = orangeTeam
    .filter(p => categorizeShootingThreat(p, shootingDist) !== 'none')
    .map(p => {
      const category = categorizeShootingThreat(p, shootingDist);
      const shooting = p.derived_attributes?.shooting || 0;
      return `${p.friendly_name}(${shooting.toFixed(2)}-${category[0].toUpperCase()})`;
    });

  debugLog += `\nShooting Threats:\n`;
  debugLog += `  Blue:   ${blueShooters.length > 0 ? blueShooters.join(', ') : 'NONE ⚠️'}\n`;
  debugLog += `  Orange: ${orangeShooters.length > 0 ? orangeShooters.join(', ') : 'NONE ⚠️'}\n`;
  debugLog += `  Imbalance Score: ${shootingImbalanceScore.toFixed(2)}${shootingImbalanceScore > 5.0 ? ' ⚠️ (High)' : ''}\n`;

  // Add performance metrics if we have enough rated players
  const blueRatedCount = blueTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS).length;
  const orangeRatedCount = orangeTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS).length;
  
  if (blueRatedCount > 0 && orangeRatedCount > 0) {
    const blueWRDisplay = blueWinRate > 1 ? blueWinRate.toFixed(1) : (blueWinRate * 100).toFixed(1);
    const orangeWRDisplay = orangeWinRate > 1 ? orangeWinRate.toFixed(1) : (orangeWinRate * 100).toFixed(1);
    const wrDiff = Math.abs((blueWinRate > 1 ? blueWinRate : blueWinRate * 100) - (orangeWinRate > 1 ? orangeWinRate : orangeWinRate * 100));
    
    debugLog += `Win Rate:       ${blueWRDisplay}%   ${orangeWRDisplay}%    ${wrDiff.toFixed(1)}%\n`;
    debugLog += `Goal Diff:      ${blueGoalDiff >= 0 ? '+' : ''}${blueGoalDiff.toFixed(0)}     ${orangeGoalDiff >= 0 ? '+' : ''}${orangeGoalDiff.toFixed(0)}      ${Math.abs(blueGoalDiff - orangeGoalDiff).toFixed(0)}\n`;
  }
  
  // Balance quality description using context-aware analysis
  const balanceThreshold = calculateDynamicBalanceThreshold(teamSize, ratingRange);
  
  // Calculate metric differences
  const attackDiff = Math.abs(blueAttack - orangeAttack);
  const defenseDiff = Math.abs(blueDefense - orangeDefense);
  const gameIqDiff = Math.abs(blueGameIq - orangeGameIq);
  
  // Calculate attribute difference if available
  let attributeDiff: number | undefined = undefined;
  if (blueAttrs.hasAttributes && orangeAttrs.hasAttributes) {
    // Calculate average difference across all 6 attributes
    const paceDiff = Math.abs(blueAttrs.pace - orangeAttrs.pace);
    const shootingDiff = Math.abs(blueAttrs.shooting - orangeAttrs.shooting);
    const passingDiff = Math.abs(blueAttrs.passing - orangeAttrs.passing);
    const dribblingDiff = Math.abs(blueAttrs.dribbling - orangeAttrs.dribbling);
    const defendingDiff = Math.abs(blueAttrs.defending - orangeAttrs.defending);
    const physicalDiff = Math.abs(blueAttrs.physical - orangeAttrs.physical);
    attributeDiff = (paceDiff + shootingDiff + passingDiff + dribblingDiff + defendingDiff + physicalDiff) / 6;
  }
  
  // Calculate performance metric differences if available
  let winRateDiff: number | undefined = undefined;
  let goalDiffDiff: number | undefined = undefined;
  
  if (blueWinRate && orangeWinRate) {
    const blueWRNorm = blueWinRate > 1 ? blueWinRate : blueWinRate * 100;
    const orangeWRNorm = orangeWinRate > 1 ? orangeWinRate : orangeWinRate * 100;
    winRateDiff = Math.abs(blueWRNorm - orangeWRNorm);
  }
  
  if (blueGoalDiff !== undefined && orangeGoalDiff !== undefined) {
    goalDiffDiff = Math.abs(blueGoalDiff - orangeGoalDiff);
  }
  
  const balanceDescription = generateBalanceQualityDescription(finalScore, balanceThreshold, {
    attackDiff,
    defenseDiff,
    gameIqDiff,
    attributeDiff,
    winRateDiff,
    goalDiffDiff
  });
  
  debugLog += `\nOverall Balance Score: ${finalScore.toFixed(3)} (${balanceDescription})\n`;
  
  // Count which team has advantages for later use
  let blueAdvantages = 0;
  let orangeAdvantages = 0;
  if (blueAvgRating > orangeAvgRating) blueAdvantages++;
  else if (orangeAvgRating > blueAvgRating) orangeAdvantages++;
  if (blueAttack > orangeAttack) blueAdvantages++;
  else if (orangeAttack > blueAttack) orangeAdvantages++;
  if (blueDefense > orangeDefense) blueAdvantages++;
  else if (orangeDefense > blueDefense) orangeAdvantages++;
  if (blueGameIq > orangeGameIq) blueAdvantages++;
  else if (orangeGameIq > blueGameIq) orangeAdvantages++;
  if (blueGk > orangeGk) blueAdvantages++;
  else if (orangeGk > blueGk) orangeAdvantages++;

  // Add Team Strength Comparison
  debugLog += '\nTEAM STRENGTH COMPARISON\n';
  debugLog += '=======================\n';
  debugLog += '             Blue    Orange  Winner\n';
  debugLog += `Avg Rating:  ${blueAvgRating.toFixed(2)}    ${orangeAvgRating.toFixed(2)}    ${blueAvgRating > orangeAvgRating ? 'Blue ↑' : orangeAvgRating > blueAvgRating ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `Attack:      ${blueAttack.toFixed(2)}    ${orangeAttack.toFixed(2)}    ${blueAttack > orangeAttack ? 'Blue ↑' : orangeAttack > blueAttack ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `Defense:     ${blueDefense.toFixed(2)}    ${orangeDefense.toFixed(2)}    ${blueDefense > orangeDefense ? 'Blue ↑' : orangeDefense > blueDefense ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `Game IQ:     ${blueGameIq.toFixed(2)}    ${orangeGameIq.toFixed(2)}    ${blueGameIq > orangeGameIq ? 'Blue ↑' : orangeGameIq > blueGameIq ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `GK:          ${blueGk.toFixed(2)}    ${orangeGk.toFixed(2)}    ${blueGk > orangeGk ? 'Blue ↑' : orangeGk > blueGk ? 'Orange ↑' : 'Tie'}\n`;

  const blueExperiencePercent = (blueRatedCount / blueTeam.length * 100).toFixed(0);
  const orangeExperiencePercent = (orangeRatedCount / orangeTeam.length * 100).toFixed(0);
  debugLog += `Experience:  ${blueExperiencePercent}%     ${orangeExperiencePercent}%      ${blueRatedCount > orangeRatedCount ? 'Blue ↑' : orangeRatedCount > blueRatedCount ? 'Orange ↑' : 'Tie'}\n`;
  
  // Add attributes comparison if available
  if (blueAttrs.hasAttributes || orangeAttrs.hasAttributes) {
    debugLog += '\nAttributes:\n';
    let blueAttrAdvantages = 0;
    let orangeAttrAdvantages = 0;
    
    const paceDiff = blueAttrs.pace - orangeAttrs.pace;
    debugLog += `  Pace:        ${(blueAttrs.pace * 10).toFixed(2)}    ${(orangeAttrs.pace * 10).toFixed(2)}    ${paceDiff > 0.05 ? 'Blue ↑' : paceDiff < -0.05 ? 'Orange ↑' : 'Tie'}\n`;
    if (paceDiff > 0.05) blueAttrAdvantages++;
    else if (paceDiff < -0.05) orangeAttrAdvantages++;
    
    const shootingDiff = blueAttrs.shooting - orangeAttrs.shooting;
    debugLog += `  Shooting:    ${(blueAttrs.shooting * 10).toFixed(2)}    ${(orangeAttrs.shooting * 10).toFixed(2)}    ${shootingDiff > 0.05 ? 'Blue ↑' : shootingDiff < -0.05 ? 'Orange ↑' : 'Tie'}\n`;
    if (shootingDiff > 0.05) blueAttrAdvantages++;
    else if (shootingDiff < -0.05) orangeAttrAdvantages++;
    
    const passingDiff = blueAttrs.passing - orangeAttrs.passing;
    debugLog += `  Passing:     ${(blueAttrs.passing * 10).toFixed(2)}    ${(orangeAttrs.passing * 10).toFixed(2)}    ${passingDiff > 0.05 ? 'Blue ↑' : passingDiff < -0.05 ? 'Orange ↑' : 'Tie'}\n`;
    if (passingDiff > 0.05) blueAttrAdvantages++;
    else if (passingDiff < -0.05) orangeAttrAdvantages++;
    
    const dribblingDiff = blueAttrs.dribbling - orangeAttrs.dribbling;
    debugLog += `  Dribbling:   ${(blueAttrs.dribbling * 10).toFixed(2)}    ${(orangeAttrs.dribbling * 10).toFixed(2)}    ${dribblingDiff > 0.05 ? 'Blue ↑' : dribblingDiff < -0.05 ? 'Orange ↑' : 'Tie'}\n`;
    if (dribblingDiff > 0.05) blueAttrAdvantages++;
    else if (dribblingDiff < -0.05) orangeAttrAdvantages++;
    
    const defendingDiff = blueAttrs.defending - orangeAttrs.defending;
    debugLog += `  Defending:   ${(blueAttrs.defending * 10).toFixed(2)}    ${(orangeAttrs.defending * 10).toFixed(2)}    ${defendingDiff > 0.05 ? 'Blue ↑' : defendingDiff < -0.05 ? 'Orange ↑' : 'Tie'}\n`;
    if (defendingDiff > 0.05) blueAttrAdvantages++;
    else if (defendingDiff < -0.05) orangeAttrAdvantages++;
    
    const physicalDiff = blueAttrs.physical - orangeAttrs.physical;
    debugLog += `  Physical:    ${(blueAttrs.physical * 10).toFixed(2)}    ${(orangeAttrs.physical * 10).toFixed(2)}    ${physicalDiff > 0.05 ? 'Blue ↑' : physicalDiff < -0.05 ? 'Orange ↑' : 'Tie'}\n`;
    if (physicalDiff > 0.05) blueAttrAdvantages++;
    else if (physicalDiff < -0.05) orangeAttrAdvantages++;
    
    debugLog += `Attribute Advantage: ${blueAttrAdvantages > orangeAttrAdvantages ? `Blue (${blueAttrAdvantages}-${orangeAttrAdvantages})` : orangeAttrAdvantages > blueAttrAdvantages ? `Orange (${orangeAttrAdvantages}-${blueAttrAdvantages})` : 'Even'}\n`;
    
    // Add attribute advantages to overall count
    if (blueAttrAdvantages > orangeAttrAdvantages) blueAdvantages++;
    else if (orangeAttrAdvantages > blueAttrAdvantages) orangeAdvantages++;
  }
  
  // Calculate overall advantage
  let teamAdvantageDescription = '';
  if (blueAdvantages > orangeAdvantages) {
    teamAdvantageDescription = `Slight advantage to Blue (${blueAdvantages}-${orangeAdvantages} in metrics)`;
  } else if (orangeAdvantages > blueAdvantages) {
    teamAdvantageDescription = `Slight advantage to Orange (${orangeAdvantages}-${blueAdvantages} in metrics)`;
  } else {
    teamAdvantageDescription = 'Teams are evenly matched';
  }
  
  debugLog += `\nOverall: ${teamAdvantageDescription}\n`;
  
  // Add Optimization Impact Summary
  if (wasOptimized && swapCount > 0) {
    debugLog += '\nOPTIMIZATION IMPACT\n';
    debugLog += '==================\n';
    debugLog += `Swaps Made: ${swapCount}\n`;
    debugLog += `Balance Improvement: ${(initialScore - finalScore).toFixed(3)} (${((1 - finalScore/initialScore) * 100).toFixed(0)}% better)\n`;
    debugLog += '\nSwap Details:\n';
    
    swapDetails.forEach((swap, index) => {
      debugLog += `${index + 1}. ${swap.bluePlayer} (Blue) ↔ ${swap.orangePlayer} (Orange)\n`;
      if (swap.tier === -1) {
        debugLog += `   Cross-tier swap, Improvement: ${swap.improvement.toFixed(3)}\n`;
      } else {
        debugLog += `   Tier: ${swap.tier}, Improvement: ${swap.improvement.toFixed(3)}\n`;
      }
    });
    
    // Identify what was improved
    const skillsImproved: string[] = [];
    const newBlueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
    const newOrangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;
    const newBlueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
    const newOrangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;
    const newBlueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
    const newOrangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;
    
    const initialBlueAttack = initialBlueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialBlueTeam.length;
    const initialOrangeAttack = initialOrangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialOrangeTeam.length;
    const initialAttackDiff = Math.abs(initialBlueAttack - initialOrangeAttack);
    const newAttackDiff = Math.abs(newBlueAttack - newOrangeAttack);
    if (newAttackDiff < initialAttackDiff) skillsImproved.push('Attack');
    
    const initialBlueDefense = initialBlueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialBlueTeam.length;
    const initialOrangeDefense = initialOrangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialOrangeTeam.length;
    const initialDefenseDiff = Math.abs(initialBlueDefense - initialOrangeDefense);
    const newDefenseDiff = Math.abs(newBlueDefense - newOrangeDefense);
    if (newDefenseDiff < initialDefenseDiff) skillsImproved.push('Defense');
    
    const initialBlueGameIq = initialBlueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialBlueTeam.length;
    const initialOrangeGameIq = initialOrangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialOrangeTeam.length;
    const initialGameIqDiff = Math.abs(initialBlueGameIq - initialOrangeGameIq);
    const newGameIqDiff = Math.abs(newBlueGameIq - newOrangeGameIq);
    if (newGameIqDiff < initialGameIqDiff) skillsImproved.push('Game IQ');
    
    if (skillsImproved.length > 0) {
      debugLog += `\nReason: Better distribution of ${skillsImproved.join(', ')} skills\n`;
    }
    
    // Add Key Decisions section
    debugLog += '\nKEY DECISIONS\n';
    debugLog += '=============\n';
    
    swapDetails.forEach((swap, index) => {
      // Find the swapped players
      const bluePlayer = blueTeam.find(p => p.friendly_name === swap.orangePlayer);
      const orangePlayer = orangeTeam.find(p => p.friendly_name === swap.bluePlayer);
      
      if (bluePlayer && orangePlayer) {
        debugLog += `Swap ${index + 1}: ${swap.bluePlayer} ↔ ${swap.orangePlayer}\n`;
        
        // Show what specific metrics improved with actual values
        if (swap.reason && swap.reason.length > 0) {
          debugLog += `  Why: ${swap.reason}\n`;
        } else {
          // Fallback to basic comparison if reason not stored
          const reasons: string[] = [];
          
          // Compare key differences between players
          const attackDiff = Math.abs((bluePlayer.attack_rating ?? 5) - (orangePlayer.attack_rating ?? 5));
          const defenseDiff = Math.abs((bluePlayer.defense_rating ?? 5) - (orangePlayer.defense_rating ?? 5));
          const gameIqDiff = Math.abs((bluePlayer.game_iq_rating ?? 5) - (orangePlayer.game_iq_rating ?? 5));
          
          if (attackDiff > 0.5) {
            reasons.push(`Attack: ${swap.bluePlayer} (${orangePlayer.attack_rating?.toFixed(1)}) vs ${swap.orangePlayer} (${bluePlayer.attack_rating?.toFixed(1)})`);
          }
          if (defenseDiff > 0.5) {
            reasons.push(`Defense: ${swap.bluePlayer} (${orangePlayer.defense_rating?.toFixed(1)}) vs ${swap.orangePlayer} (${bluePlayer.defense_rating?.toFixed(1)})`);
          }
          if (gameIqDiff > 0.5) {
            reasons.push(`Game IQ: ${swap.bluePlayer} (${orangePlayer.game_iq_rating?.toFixed(1)}) vs ${swap.orangePlayer} (${bluePlayer.game_iq_rating?.toFixed(1)})`);
          }
          
          if (reasons.length > 0) {
            debugLog += `  Why: ${reasons.join('; ')}\n`;
          }
        }
        
        debugLog += `  Impact: Balance improved by ${swap.improvement.toFixed(3)}`;
        
        // Show which balance metric improved most
        if (swap.balanceType) {
          debugLog += ` (${swap.balanceType})`;
        }
        
        debugLog += '\n';
      }
    });
  } else if (!wasOptimized) {
    debugLog += '\nOPTIMIZATION IMPACT\n';
    debugLog += '==================\n';
    debugLog += 'No optimization needed - initial draft was already well-balanced\n';
  }
  
  // Add Draft Value Analysis
  debugLog += '\nDRAFT VALUE ANALYSIS\n';
  debugLog += '===================\n';
  
  // Analyze draft values
  const draftValueInsights: string[] = [];
  
  // Find players who might have been picked too early or too late
  tiers.forEach((tier, tierIndex) => {
    const tierAvgRating = tier.players.reduce((sum, p) => sum + p.threeLayerRating, 0) / tier.players.length;
    
    tier.players.forEach(player => {
      const ratingDiff = player.threeLayerRating - tierAvgRating;
      
      // Players significantly above tier average (potential steals)
      if (ratingDiff > 0.3) {
        const position = tier.players.indexOf(player) + 1;
        draftValueInsights.push(`${player.friendly_name} (Tier ${tierIndex + 1}, Pick ${position}) - Rating ${player.threeLayerRating.toFixed(2)} vs Tier avg ${tierAvgRating.toFixed(2)} (+${ratingDiff.toFixed(2)})`);
      }
    });
  });
  
  if (draftValueInsights.length > 0) {
    debugLog += 'Best Value Picks:\n';
    draftValueInsights.forEach(insight => {
      debugLog += `- ${insight}\n`;
    });
  }
  
  // Find players without performance data in high tiers
  const highTierUnknowns: string[] = [];
  tiers.slice(0, 2).forEach((tier, tierIndex) => {
    tier.players.forEach(player => {
      if (!player.total_games || player.total_games < MIN_GAMES_FOR_STATS) {
        highTierUnknowns.push(`${player.friendly_name} (Tier ${tierIndex + 1}) - No performance data to justify tier`);
      }
    });
  });
  
  if (highTierUnknowns.length > 0) {
    debugLog += '\nPotential Reaches:\n';
    highTierUnknowns.forEach(reach => {
      debugLog += `- ${reach}\n`;
    });
  }
  
  // Analyze tier movement due to performance adjustment
  const bigMovers = playersWithPositions.filter(p => Math.abs(p.threeLayerRating - p.baseSkillRating) > 0.5);
  if (bigMovers.length > 0) {
    debugLog += '\nSignificant Performance Adjustments:\n';
    bigMovers.sort((a, b) => Math.abs(b.threeLayerRating - b.baseSkillRating) - Math.abs(a.threeLayerRating - a.baseSkillRating))
      .slice(0, 3)
      .forEach(player => {
        const change = player.threeLayerRating - player.baseSkillRating;
        const direction = change > 0 ? 'boosted' : 'dropped';
        debugLog += `- ${player.friendly_name}: ${direction} ${Math.abs(change).toFixed(2)} points due to ${direction === 'boosted' ? 'strong' : 'poor'} performance\n`;
      });
  }
  
  // Add Team Composition by Tier
  debugLog += '\nTEAM COMPOSITION BY TIER\n';
  debugLog += '========================\n';
  debugLog += '       Tier 1  Tier 2  Tier 3  Tier 4  Tier 5\n';
  
  // Count players by tier for each team
  const blueTierCounts = new Array(5).fill(0);
  const orangeTierCounts = new Array(5).fill(0);
  
  blueTeam.forEach(player => {
    if (player.tier && player.tier >= 1 && player.tier <= 5) {
      blueTierCounts[player.tier - 1]++;
    }
  });
  
  orangeTeam.forEach(player => {
    if (player.tier && player.tier >= 1 && player.tier <= 5) {
      orangeTierCounts[player.tier - 1]++;
    }
  });
  
  // Display the counts
  debugLog += 'Blue:  ';
  blueTierCounts.forEach(count => {
    debugLog += `   ${count}    `;
  });
  debugLog += '\n';
  
  debugLog += 'Orange:';
  orangeTierCounts.forEach(count => {
    debugLog += `   ${count}    `;
  });
  debugLog += '\n';
  
  // Add visual representation
  debugLog += '\nVisual Distribution:\n';
  for (let i = 0; i < 5; i++) {
    if (tierSizes[i]) {
      debugLog += `Tier ${i + 1}: `;
      debugLog += '🔵'.repeat(blueTierCounts[i]);
      debugLog += '🟠'.repeat(orangeTierCounts[i]);
      debugLog += ` (${blueTierCounts[i]}B/${orangeTierCounts[i]}O)\n`;
    }
  }
  
  // Calculate balance quality description
  if (finalScore <= 0.2) {
    executiveSummaryData.balanceQuality = 'Excellent';
  } else if (finalScore <= 0.5) {
    executiveSummaryData.balanceQuality = 'Good';
  } else if (finalScore <= 1.0) {
    executiveSummaryData.balanceQuality = 'Fair';
  } else {
    executiveSummaryData.balanceQuality = 'Poor';
  }
  
  if (blueAdvantages > orangeAdvantages) {
    executiveSummaryData.teamStrengthAdvantage = `Blue (${blueAdvantages}-${orangeAdvantages} in metrics)`;
  } else if (orangeAdvantages > blueAdvantages) {
    executiveSummaryData.teamStrengthAdvantage = `Orange (${orangeAdvantages}-${blueAdvantages} in metrics)`;
  } else {
    executiveSummaryData.teamStrengthAdvantage = 'Even';
  }
  
  // Calculate execution time
  const executionTime = Date.now() - startTime;

  // Calculate final systematic bias
  const finalBias = calculateDraftBias(blueTeam, orangeTeam);

  // Create the executive summary with enhanced metrics
  const executiveSummary = `EXECUTIVE SUMMARY
════════════════════════════════════════════════════════════════════════════════
Algorithm: Tier-Based Snake Draft with SA + Bias Awareness + Soft Penalties
Execution Time: ${executionTime}ms
Players: ${executiveSummaryData.totalPlayers} (${executiveSummaryData.ratedPlayers} rated, ${executiveSummaryData.newPlayers} new)
Playstyle Coverage: ${playstyleCoverage}% (${playersWithPlaystyles.length}/${players.length} players rated)
Tiers: ${executiveSummaryData.tierCount} (sizes: ${executiveSummaryData.tierSizes})

📊 BALANCE METRICS:
  • Final Balance Score: ${executiveSummaryData.finalBalance.toFixed(3)} (${executiveSummaryData.balanceQuality})
  • Metric Distribution: ${finalBias.details}
  • Systematic Bias: ${(finalBias.bias * 100).toFixed(0)}% (${finalBias.bias === 0 ? 'PERFECT' : finalBias.bias < 0.3 ? 'GOOD' : 'NEEDS REVIEW'})

🔄 OPTIMIZATION:
  • Swaps Made: ${executiveSummaryData.optimizationSwaps}
  • Initial → Final: ${initialScore.toFixed(3)} → ${executiveSummaryData.finalBalance.toFixed(3)} (${((1 - executiveSummaryData.finalBalance/initialScore) * 100).toFixed(0)}% improvement)
  • SA Active: Yes (explored alternative configurations)

⚖️ FINAL VERDICT:
  • Team Advantage: ${executiveSummaryData.teamStrengthAdvantage}
  • Result: ${executiveSummaryData.balanceQuality === 'Excellent' || executiveSummaryData.balanceQuality === 'Good' ? 'Well-balanced teams' : 'Teams may need manual review'}
════════════════════════════════════════════════════════════════════════════════`;

  // Replace the placeholder with the actual summary
  debugLog = debugLog.replace(executiveSummaryPlaceholder, executiveSummary);

  // Add footer with timing info
  debugLog += '\n═══════════════════════════════════════════════════════════════════════════════\n';
  debugLog += `                         END OF DEBUG LOG (${executionTime}ms)\n`;
  debugLog += '═══════════════════════════════════════════════════════════════════════════════\n';

  return {
    blueTeam,
    orangeTeam,
    tiers,
    initialScore,
    optimizedScore: finalScore,
    wasOptimized,
    confidenceLevel: confidence.level,
    confidenceMessage: confidence.message,
    debugLog
  };
}