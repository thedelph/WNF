import { TeamAssignment } from './types';
import { calculateBalanceScore } from '../../../utils/teamBalancing';

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
  // After many failed attempts, relax constraints to find ANY improvement
  if (failedAttempts > 20) {
    baseThreshold *= 2.0; // Double threshold after 20 failures
  } else if (failedAttempts > 10) {
    baseThreshold *= 1.5; // 50% more lenient after 10 failures
  } else if (failedAttempts > 5) {
    baseThreshold *= 1.25; // 25% more lenient after 5 failures
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
}

export interface TierInfo {
  tierNumber: number;
  players: PlayerWithRating[];
  skillRange: { min: number; max: number };
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

  // Apply penalty multiplier for extreme differences (> 3.0)
  // This creates a hybrid approach: mostly average, but penalizes extreme imbalances
  let penaltyMultiplier = 1.0;
  if (maxDiff > 4.0) {
    penaltyMultiplier = 1.5; // 50% penalty for very extreme differences
  } else if (maxDiff > 3.0) {
    penaltyMultiplier = 1.25; // 25% penalty for extreme differences
  }

  // Apply dominance penalty similar to skill balance
  // If dominance = 0 (3-3 split): use 80% of avg diff (reward complementary attributes moderately)
  // If dominance = 1 (6-0 split): use 100% of avg diff (penalize one-sided dominance)
  // Changed from 0.7-0.3 to 0.8-0.2 (attributes are less critical than core skills)
  const dominancePenalty = 0.8 + (attributeDominance * 0.2);

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

  // Penalty for attribute imbalance (10% weight, negative)
  // Lower attribute imbalance = higher priority
  priority -= (attributeBalance / 5) * 1.0;

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
      // Check if either team has reached the target size
      if (blueTeam.length >= targetTeamSize && orangeTeam.length < targetTeamSize) {
        orangeTeam.push(player);
        if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Orange (Blue team full)\n`;
      } else if (orangeTeam.length >= targetTeamSize && blueTeam.length < targetTeamSize) {
        blueTeam.push(player);
        if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Blue (Orange team full)\n`;
      } else {
        // Normal snake draft distribution
        if (bluePicksFirst) {
          // Blue picks on even indices (0, 2, 4...)
          if (index % 2 === 0) {
            blueTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Blue\n`;
          } else {
            orangeTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Orange\n`;
          }
        } else {
          // Orange picks on even indices (0, 2, 4...)
          if (index % 2 === 0) {
            orangeTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Orange\n`;
          } else {
            blueTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Blue\n`;
          }
        }
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

  // NEW: Complementary strengths balancing
  // Count how many skills each team "wins" (is better at)
  const blueWins =
    (blueAttack > orangeAttack ? 1 : 0) +
    (blueDefense > orangeDefense ? 1 : 0) +
    (blueGameIq > orangeGameIq ? 1 : 0) +
    (blueGk > orangeGk ? 1 : 0);

  // Dominance factor: 0 = perfectly balanced (2.0 wins each), 1 = total dominance (4-0 or 0-4)
  // Ideal: each team wins ~2.0 skills (rounded to nearest 0.5)
  const dominanceFactor = Math.abs(blueWins - 2.0) / 2.0;

  // Apply dominance penalty to skill balance
  // If dominance = 0 (2-2 split): use 70% of max diff (reward complementary strengths moderately)
  // If dominance = 1 (4-0 split): use 100% of max diff (penalize one-sided dominance)
  // Changed from 0.5-0.5 to 0.7-0.3 to prevent premature optimization stopping
  const maxSkillDiff = Math.max(attackDiff, defenseDiff, gameIqDiff, gkDiff);
  const skillBalance = maxSkillDiff * (0.7 + dominanceFactor * 0.3);

  // Calculate attribute balance score
  const attributeBalance = calculateAttributeBalanceScore(blueTeam, orangeTeam);

  // Weight skills at 85% and attributes at 15% to reduce attribute blocking
  // This makes core skills more important while still considering playstyles
  const combinedBalance = (skillBalance * 0.85) + (attributeBalance * 0.15);

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
  const skillBalance = Math.max(attackDiff, defenseDiff, gameIqDiff, gkDiff);

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
        const sortedByRating = playersInTier.sort((a, b) => b.threeLayerRating - a.threeLayerRating);
        
        const highestRating = sortedByRating[0].threeLayerRating;
        const lowestRating = sortedByRating[sortedByRating.length - 1].threeLayerRating;
        const ratingSpread = highestRating - lowestRating;
        
        // If there's a significant rating spread, check for quality concentration
        if (ratingSpread > QUALITY_CONCENTRATION_THRESHOLD) {
          // Identify bottom players (lowest 2 players in tier)
          const bottomPlayers = sortedByRating.slice(-2);
          
          // Check if one team has both/all bottom players
          const blueBottomPlayers = bottomPlayers.filter(p => 
            blueTeam.some(bp => bp.player_id === p.player_id)
          );
          const orangeBottomPlayers = bottomPlayers.filter(p => 
            orangeTeam.some(op => op.player_id === p.player_id)
          );
          
          // If one team has all bottom players (when there are 2+ bottom players), it's unfair
          if (bottomPlayers.length >= 2 && 
              (blueBottomPlayers.length === bottomPlayers.length || 
               orangeBottomPlayers.length === bottomPlayers.length)) {
            return false; // Quality concentration detected
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
        const sortedByRating = playersInTier.sort((a, b) => b.threeLayerRating - a.threeLayerRating);
        
        const highestRating = sortedByRating[0].threeLayerRating;
        const lowestRating = sortedByRating[sortedByRating.length - 1].threeLayerRating;
        const ratingSpread = highestRating - lowestRating;
        
        if (ratingSpread > QUALITY_CONCENTRATION_THRESHOLD) {
          const bottomPlayers = sortedByRating.slice(-2);
          
          const blueBottomPlayers = bottomPlayers.filter(p => 
            blueTeam.some(bp => bp.player_id === p.player_id)
          );
          const orangeBottomPlayers = bottomPlayers.filter(p => 
            orangeTeam.some(op => op.player_id === p.player_id)
          );
          
          if (bottomPlayers.length >= 2 && blueBottomPlayers.length === bottomPlayers.length) {
            const playerNames = bottomPlayers.map(p => p.friendly_name).join(', ');
            return `Blue would get all bottom players in Tier ${tier}: ${playerNames}`;
          }
          if (bottomPlayers.length >= 2 && orangeBottomPlayers.length === bottomPlayers.length) {
            const playerNames = bottomPlayers.map(p => p.friendly_name).join(', ');
            return `Orange would get all bottom players in Tier ${tier}: ${playerNames}`;
          }
        }
      }
    }
  }

  return null; // No issues found
}

/**
 * Improved validation that allows swaps unless they make concentrations worse
 * Returns object with acceptance status and rejection reason if applicable
 */
function isSwapAcceptable(
  beforeBlueTeam: PlayerWithRating[],
  beforeOrangeTeam: PlayerWithRating[],
  afterBlueTeam: PlayerWithRating[],
  afterOrangeTeam: PlayerWithRating[],
  balanceImprovement?: number
): { acceptable: boolean; rejectReason?: string } {
  // First check tier distribution issues
  const beforeIssues = getTierDistributionIssues(beforeBlueTeam, beforeOrangeTeam);
  const afterIssues = getTierDistributionIssues(afterBlueTeam, afterOrangeTeam);

  // Calculate shooting distribution for all players
  const allPlayers = [...beforeBlueTeam, ...beforeOrangeTeam];
  const shootingDist = analyzeShootingDistribution(allPlayers);
  const shootingStats = calculateShootingStats(allPlayers);

  // HARD CONSTRAINT: Check elite shooter clustering
  // Count elite shooters (p90 and above) before and after
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

  // Reject if swap creates elite shooter clustering (gap > 1)
  // UNLESS it fixes an existing clustering issue
  if (afterEliteGap > 1) {
    // Only allow if this reduces existing elite gap
    if (afterEliteGap >= beforeEliteGap) {
      // Check if overall improvement is exceptional (> 0.30)
      if (balanceImprovement === undefined || balanceImprovement < 0.30) {
        return { acceptable: false, rejectReason: `Elite shooter clustering (gap: ${afterEliteGap})` }; // VETO
      }
    }
  }

  // Check shooting balance before and after the swap
  const beforeShootingImbalance = calculateShootingImbalance(beforeBlueTeam, beforeOrangeTeam, shootingDist);
  const afterShootingImbalance = calculateShootingImbalance(afterBlueTeam, afterOrangeTeam, shootingDist);

  // Check if swap significantly improves shooting distribution
  const shootingImprovement = beforeShootingImbalance - afterShootingImbalance;

  // Dynamic improvement threshold based on standard deviation
  const significantImprovement = shootingStats.stdDev * 0.5; // Half a standard deviation
  if (shootingImprovement > significantImprovement) {
    // This swap significantly improves shooting balance - prioritize it
    return { acceptable: true };
  }

  // Standard deviation-based constraint for shooting balance
  const afterBlueShooting = afterBlueTeam.map(p => p.derived_attributes?.shooting || 0);
  const afterOrangeShooting = afterOrangeTeam.map(p => p.derived_attributes?.shooting || 0);

  const afterBlueMean = afterBlueShooting.reduce((sum, v) => sum + v, 0) / afterBlueTeam.length;
  const afterOrangeMean = afterOrangeShooting.reduce((sum, v) => sum + v, 0) / afterOrangeTeam.length;

  const shootingMeanGap = Math.abs(afterBlueMean - afterOrangeMean);

  // Reject if mean gap exceeds 1.5 standard deviations
  const maxAcceptableGap = shootingStats.stdDev * 1.5;
  if (shootingMeanGap > maxAcceptableGap && shootingStats.stdDev > 0.1) {
    // Only reject if this makes shooting worse than before
    const beforeBlueMean = beforeBlueTeam.map(p => p.derived_attributes?.shooting || 0)
      .reduce((sum, v) => sum + v, 0) / beforeBlueTeam.length;
    const beforeOrangeMean = beforeOrangeTeam.map(p => p.derived_attributes?.shooting || 0)
      .reduce((sum, v) => sum + v, 0) / beforeOrangeTeam.length;
    const beforeGap = Math.abs(beforeBlueMean - beforeOrangeMean);

    if (shootingMeanGap > beforeGap) {
      // Allow if overall balance improvement is substantial
      if (balanceImprovement === undefined || balanceImprovement < 0.15) {
        return { acceptable: false, rejectReason: `Shooting mean gap ${shootingMeanGap.toFixed(2)} > ${maxAcceptableGap.toFixed(2)}` };
      }
    }
  }

  // Percentile distribution constraint
  const afterBlueAboveP50 = afterBlueTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
  ).length;
  const afterOrangeAboveP50 = afterOrangeTeam.filter(p =>
    (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
  ).length;

  // Reject if one team has less than 20% of shooters above median
  const blueShooterRatio = afterBlueAboveP50 / afterBlueTeam.length;
  const orangeShooterRatio = afterOrangeAboveP50 / afterOrangeTeam.length;
  const minShooterRatio = 0.2; // At least 20% of team should be above median

  if (blueShooterRatio < minShooterRatio || orangeShooterRatio < minShooterRatio) {
    // Check if this fixes an existing problem
    const beforeBlueAboveP50 = beforeBlueTeam.filter(p =>
      (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
    ).length;
    const beforeOrangeAboveP50 = beforeOrangeTeam.filter(p =>
      (p.derived_attributes?.shooting || 0) > shootingDist.percentiles.p50
    ).length;

    const beforeBlueRatio = beforeBlueAboveP50 / beforeBlueTeam.length;
    const beforeOrangeRatio = beforeOrangeAboveP50 / beforeOrangeTeam.length;

    // Only reject if this makes things worse
    if (blueShooterRatio < beforeBlueRatio || orangeShooterRatio < beforeOrangeRatio) {
      if (balanceImprovement === undefined || balanceImprovement < 0.10) {
        return { acceptable: false, rejectReason: `Insufficient shooters above median (Blue: ${(blueShooterRatio * 100).toFixed(0)}%, Orange: ${(orangeShooterRatio * 100).toFixed(0)}%)` };
      }
    }
  }

  // Original tier distribution logic
  // If no issues before or after, swap is acceptable
  if (!beforeIssues && !afterIssues) {
    return { acceptable: true };
  }

  // If there were no issues before but issues after, swap creates new concentration
  // Allow it if the balance improvement is significant (> 0.10)
  if (!beforeIssues && afterIssues) {
    return balanceImprovement !== undefined && balanceImprovement > 0.10
      ? { acceptable: true }
      : { acceptable: false, rejectReason: afterIssues || 'Tier concentration created' };
  }

  // If there were issues before but none after, swap fixes concentration (accept!)
  if (beforeIssues && !afterIssues) {
    return { acceptable: true };
  }

  // Both before and after have issues - check if they're the same or different
  if (beforeIssues && afterIssues) {
    // If it's the same issue, swap doesn't make it worse (accept)
    // If it's a different issue, check if improvement is significant
    if (beforeIssues === afterIssues) {
      return { acceptable: true };
    }
    // Different issue - allow if improvement is significant
    return balanceImprovement !== undefined && balanceImprovement > 0.10
      ? { acceptable: true }
      : { acceptable: false, rejectReason: `Changed tier issue: ${afterIssues}` };
  }

  return { acceptable: false, rejectReason: 'Unknown validation failure' }; // Default to reject if unclear
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
  tierIssue: string | null
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

    if (attributeBalance > attributeThreshold) {
      rejectionReasons.push(`Attribute constraint (${attributeBalance.toFixed(2)} > ${attributeThreshold.toFixed(2)})`);
    }
    if (tierIssue) {
      rejectionReasons.push(`Tier distribution (${tierIssue})`);
    }
    if (improvement < 0.05) {
      rejectionReasons.push(`Minimal improvement (${improvement.toFixed(3)} < 0.05)`);
    }

    // Calculate weighted decision score for transparency
    const skillImprovement = (beforeDetails.skillBalance ?? 0) - (afterDetails.skillBalance ?? 0);
    const weightedScore = (skillImprovement * 0.65) - (attributeBalance * 0.15);

    if (rejectionReasons.length > 0) {
      analysis += rejectionReasons.join(', ');
      analysis += ` [weighted score: ${weightedScore.toFixed(3)}]`;
    } else {
      analysis += `Unknown reason`;
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
  debugLog?: { value: string }
): {
  bestSwap: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating } | null;
  bestScore: number;
  improved: boolean;
} {
  if (blueTierPlayers.length === 0 || orangeTierPlayers.length === 0) {
    return { bestSwap: null, bestScore: currentBalance, improved: false };
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

      // Additional check: reject swaps that create excessive attribute imbalance
      // using dynamic threshold based on improvement score and win rate gap
      const attributeThreshold = getAttributeBalanceThreshold(
        improvement,
        currentBalance,
        failedAttempts,
        winRateGapBefore,
        winRateGapAfter
      );
      if (isSwapOk && attributeBalance > attributeThreshold) {
        // Reject if attribute imbalance exceeds the dynamic threshold
        isSwapOk = false;
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
          issue
        );

        debugLog.value += swapAnalysis;
        debugLog.value += `\n`;
      }
      
      if (newBalance < bestScore && isSwapOk) {
        bestScore = newBalance;
        bestSwap = { bluePlayer, orangePlayer };
        improved = true;
      }
    }
  }

  if (debugLog) {
    if (improved && bestSwap) {
      debugLog.value += `    Best same-tier swap: ${bestSwap.bluePlayer.friendly_name} ↔ ${bestSwap.orangePlayer.friendly_name}\n`;
      debugLog.value += `    Improvement: ${(currentBalance - bestScore).toFixed(3)} (${bestScore.toFixed(3)})\n`;
      
      // Add detailed explanation of what improved
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
          debugLog.value += 'Overall balance improvement';
        }
        debugLog.value += `\n`;
      }
    } else {
      debugLog.value += `    No beneficial same-tier swaps found\n`;
    }
  }

  return { bestSwap, bestScore, improved };
}

/**
 * Try cross-tier swaps between two adjacent tiers
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

      // Additional check: reject swaps that create excessive attribute imbalance
      // using dynamic threshold based on improvement score and win rate gap
      const attributeThreshold = getAttributeBalanceThreshold(
        improvement,
        currentBalance,
        failedAttempts,
        winRateGapBefore,
        winRateGapAfter
      );
      if (isSwapOk && attributeBalance > attributeThreshold) {
        // Reject if attribute imbalance exceeds the dynamic threshold
        isSwapOk = false;
      }
      
      if (debugLog) {
        debugLog.value += `    Trying ${blueLower.friendly_name}(T${lowerTier}) ↔ ${orangeUpper.friendly_name}(T${upperTier}): `;
        debugLog.value += `balance ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`;
        if (newBalance < currentBalance) {
          debugLog.value += ` (improves by ${(currentBalance - newBalance).toFixed(3)})`;
        }
        if (!isSwapOk) {
          if (swapRejectReason) {
            // Use the rejection reason from isSwapAcceptable
            debugLog.value += ` → REJECTED (${swapRejectReason})`;
          } else {
            // Fallback to old logic if no specific reason
            const issue = getTierDistributionIssues(tempBlue, tempOrange);
            const attributeThreshold = getAttributeBalanceThreshold(improvement, winRateGapBefore, winRateGapAfter);
            if (attributeBalance > attributeThreshold) {
              debugLog.value += ` → REJECTED (attribute imbalance ${attributeBalance.toFixed(2)} > ${attributeThreshold.toFixed(2)} for improvement ${improvement.toFixed(3)})`;
            } else {
              debugLog.value += ` → REJECTED (${issue}, improvement ${improvement.toFixed(3)} < 0.10)`;
            }
          }
        } else if (newBalance < bestScore) {
          const issue = getTierDistributionIssues(tempBlue, tempOrange);
          if (issue && improvement > 0.10) {
            debugLog.value += ` → ACCEPTED (allows ${issue} due to improvement ${improvement.toFixed(3)} > 0.10)`;
          } else {
            debugLog.value += ` → ACCEPTED`;
          }
        } else {
          debugLog.value += ` → no improvement`;
        }
        debugLog.value += `\n`;
      }
      
      if (newBalance < bestScore && isSwapOk) {
        bestScore = newBalance;
        bestSwap = { 
          bluePlayer: blueLower, 
          orangePlayer: orangeUpper,
          blueTier: lowerTier,
          orangeTier: upperTier
        };
        improved = true;
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

      // Additional check: reject swaps that create excessive attribute imbalance
      // using dynamic threshold based on improvement score and win rate gap
      const attributeThreshold = getAttributeBalanceThreshold(
        improvement,
        currentBalance,
        failedAttempts,
        winRateGapBefore,
        winRateGapAfter
      );
      if (isSwapOk && attributeBalance > attributeThreshold) {
        // Reject if attribute imbalance exceeds the dynamic threshold
        isSwapOk = false;
      }
      
      if (debugLog) {
        debugLog.value += `    Trying ${blueUpper.friendly_name}(T${upperTier}) ↔ ${orangeLower.friendly_name}(T${lowerTier}): `;
        debugLog.value += `balance ${currentBalance.toFixed(3)} → ${newBalance.toFixed(3)}`;
        if (newBalance < currentBalance) {
          debugLog.value += ` (improves by ${(currentBalance - newBalance).toFixed(3)})`;
        }
        if (!isSwapOk) {
          if (swapRejectReason) {
            // Use the rejection reason from isSwapAcceptable
            debugLog.value += ` → REJECTED (${swapRejectReason})`;
          } else {
            // Fallback to old logic if no specific reason
            const issue = getTierDistributionIssues(tempBlue, tempOrange);
            const attributeThreshold = getAttributeBalanceThreshold(improvement, winRateGapBefore, winRateGapAfter);
            if (attributeBalance > attributeThreshold) {
              debugLog.value += ` → REJECTED (attribute imbalance ${attributeBalance.toFixed(2)} > ${attributeThreshold.toFixed(2)} for improvement ${improvement.toFixed(3)})`;
            } else {
              debugLog.value += ` → REJECTED (${issue}, improvement ${improvement.toFixed(3)} < 0.10)`;
            }
          }
        } else if (newBalance < bestScore) {
          const issue = getTierDistributionIssues(tempBlue, tempOrange);
          if (issue && improvement > 0.10) {
            debugLog.value += ` → ACCEPTED (allows ${issue} due to improvement ${improvement.toFixed(3)} > 0.10)`;
          } else {
            debugLog.value += ` → ACCEPTED`;
          }
        } else {
          debugLog.value += ` → no improvement`;
        }
        debugLog.value += `\n`;
      }
      
      if (newBalance < bestScore && isSwapOk) {
        bestScore = newBalance;
        bestSwap = { 
          bluePlayer: blueUpper, 
          orangePlayer: orangeLower,
          blueTier: upperTier,
          orangeTier: lowerTier
        };
        improved = true;
      }
    }
  }

  if (debugLog) {
    if (improved && bestSwap) {
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
          debugLog.value += 'Overall balance improvement';
        }
        debugLog.value += `\n`;
      }
    } else {
      debugLog.value += `    No beneficial cross-tier swaps found\n`;
    }
  }

  return { bestSwap, bestScore, improved };
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
  
  // Only optimize if balance exceeds threshold
  if (currentBalance <= balanceThreshold) {
    if (debugLog) {
      debugLog.value += 'No optimization needed - balance is within threshold\n\n';
    }
    return {
      blueTeam,
      orangeTeam,
      finalScore: currentBalance,
      wasOptimized: false,
      swapCount: 0,
      swapDetails: []
    };
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
  const MAX_ITERATIONS = 100;
  const MAX_OPTIMIZATION_ROUNDS = 5; // Increased from 3 to allow more optimization attempts
  let optimizationRound = 0;
  let madeSwapThisRound = true;
  let totalFailedAttempts = 0; // Track total failed swap attempts for progressive relaxation

  // Multi-pass optimization strategy
  const OPTIMIZATION_PASSES = [
    { name: 'Pass 1: Skills Focus', attributeMultiplier: 2.0, description: 'Prioritize skill balance with relaxed attribute constraints' },
    { name: 'Pass 2: Balanced', attributeMultiplier: 1.0, description: 'Normal balance between skills and attributes' },
    { name: 'Pass 3: Fine-tuning', attributeMultiplier: 0.8, description: 'Strict constraints for minor adjustments' }
  ];

  let currentPassIndex = 0;

  // Continue optimization rounds while improvements are being made
  while (madeSwapThisRound && optimizationRound < MAX_OPTIMIZATION_ROUNDS && currentBalance > balanceThreshold) {
    madeSwapThisRound = false;
    optimizationRound++;

    // Move to next pass if we've exhausted attempts in current pass
    if (totalFailedAttempts > 30 && currentPassIndex < OPTIMIZATION_PASSES.length - 1) {
      currentPassIndex++;
      totalFailedAttempts = 0; // Reset for new pass
      if (debugLog) {
        const pass = OPTIMIZATION_PASSES[currentPassIndex];
        debugLog.value += `\nMoving to ${pass.name} - ${pass.description}\n`;
        debugLog.value += `Attribute threshold multiplier: ${pass.attributeMultiplier}x\n\n`;
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
    
    // Phase 1: Try same-tier swaps
    const sameTierResult = trySameTierSwaps(
      currentTier,
      blueTeam,
      orangeTeam,
      blueTierPlayers,
      orangeTierPlayers,
      currentBalance,
      permanentGKIds,
      totalFailedAttempts,
      debugLog
    );
    
    // Track failed attempts if no improvement found
    if (!sameTierResult.improved) {
      totalFailedAttempts++;
    } else {
      totalFailedAttempts = 0; // Reset on successful swap
    }

    // Execute same-tier swap if beneficial
    if (sameTierResult.improved && sameTierResult.bestSwap) {
      const blueIndex = blueTeam.findIndex(p => p.player_id === sameTierResult.bestSwap.bluePlayer.player_id);
      const orangeIndex = orangeTeam.findIndex(p => p.player_id === sameTierResult.bestSwap.orangePlayer.player_id);
      
      // Calculate before swap details
      const beforeDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

      if (debugLog) {
        debugLog.value += `  Executing same-tier swap: ${sameTierResult.bestSwap.bluePlayer.friendly_name} ↔ ${sameTierResult.bestSwap.orangePlayer.friendly_name}\n`;
        debugLog.value += `    Balance improved: ${currentBalance.toFixed(3)} → ${sameTierResult.bestScore.toFixed(3)}\n`;
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
        debugLog
      );
      
      // Track failed attempts if no improvement found
      if (!crossTierResult.improved) {
        totalFailedAttempts++;
      } else {
        totalFailedAttempts = 0; // Reset on successful swap
      }

      // Execute cross-tier swap if beneficial
      if (crossTierResult.improved && crossTierResult.bestSwap) {
        const blueIndex = blueTeam.findIndex(p => p.player_id === crossTierResult.bestSwap.bluePlayer.player_id);
        const orangeIndex = orangeTeam.findIndex(p => p.player_id === crossTierResult.bestSwap.orangePlayer.player_id);
        
        // Calculate before swap details
        const beforeCrossDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

        if (debugLog) {
          debugLog.value += `  Executing cross-tier swap: ${crossTierResult.bestSwap.bluePlayer.friendly_name}(T${crossTierResult.bestSwap.blueTier}) ↔ ${crossTierResult.bestSwap.orangePlayer.friendly_name}(T${crossTierResult.bestSwap.orangeTier})\n`;
          debugLog.value += `    Balance improved: ${currentBalance.toFixed(3)} → ${crossTierResult.bestScore.toFixed(3)}\n`;
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
              debugLog
            );

            if (nonAdjacentResult.improved && nonAdjacentResult.bestSwap) {
              const blueIndex = blueTeam.findIndex(p => p.player_id === nonAdjacentResult.bestSwap.bluePlayer.player_id);
              const orangeIndex = orangeTeam.findIndex(p => p.player_id === nonAdjacentResult.bestSwap.orangePlayer.player_id);

              const beforeNonAdjacentDetails = calculateDetailedBalanceScore(blueTeam, orangeTeam, permanentGKIds);

              if (debugLog) {
                debugLog.value += `  Executing non-adjacent tier swap for shooting balance:\n`;
                debugLog.value += `    ${nonAdjacentResult.bestSwap.bluePlayer.friendly_name} (T${nonAdjacentResult.bestSwap.blueTier}) ↔ `;
                debugLog.value += `${nonAdjacentResult.bestSwap.orangePlayer.friendly_name} (T${nonAdjacentResult.bestSwap.orangeTier})\n`;
                debugLog.value += `    Balance improved: ${currentBalance.toFixed(3)} → ${nonAdjacentResult.bestScore.toFixed(3)}\n`;
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
  } // End of while loop for optimization rounds

  // FALLBACK STRATEGIES if no swaps were made and balance is still poor
  if (swapCount === 0 && currentBalance > balanceThreshold * 1.5) {
    if (debugLog) {
      debugLog.value += '\n=== FALLBACK STRATEGY ACTIVATED ===\n';
      debugLog.value += `No swaps made yet and balance (${currentBalance.toFixed(3)}) is poor.\n`;
      debugLog.value += `Attempting skill-only optimization (ignoring attributes)...\n\n`;
    }

    // Try one more time with extremely relaxed constraints
    const fallbackAttempts = 30; // High number to trigger maximum relaxation
    let fallbackSwapMade = false;

    for (const tier of allTiers) {
      const blueTierPlayers = blueTiers.get(tier) || [];
      const orangeTierPlayers = orangeTiers.get(tier) || [];

      if (blueTierPlayers.length > 0 && orangeTierPlayers.length > 0) {
        // Try swaps with very relaxed constraints
        const fallbackResult = trySameTierSwaps(
          tier,
          blueTeam,
          orangeTeam,
          blueTierPlayers,
          orangeTierPlayers,
          currentBalance,
          permanentGKIds,
          fallbackAttempts, // This will trigger maximum threshold relaxation
          debugLog
        );

        if (fallbackResult.improved && fallbackResult.bestSwap) {
          const blueIndex = blueTeam.findIndex(p => p.player_id === fallbackResult.bestSwap.bluePlayer.player_id);
          const orangeIndex = orangeTeam.findIndex(p => p.player_id === fallbackResult.bestSwap.orangePlayer.player_id);

          if (debugLog) {
            debugLog.value += `  FALLBACK SWAP FOUND: ${fallbackResult.bestSwap.bluePlayer.friendly_name} ↔ ${fallbackResult.bestSwap.orangePlayer.friendly_name}\n`;
            debugLog.value += `  Balance improved: ${currentBalance.toFixed(3)} → ${fallbackResult.bestScore.toFixed(3)}\n\n`;
          }

          blueTeam[blueIndex] = fallbackResult.bestSwap.orangePlayer;
          orangeTeam[orangeIndex] = fallbackResult.bestSwap.bluePlayer;

          swapCount++;
          currentBalance = fallbackResult.bestScore;
          wasOptimized = true;
          fallbackSwapMade = true;
          break; // Take first improvement found
        }
      }
    }

    if (!fallbackSwapMade && debugLog) {
      debugLog.value += `  No improvements found even with relaxed constraints.\n`;
      debugLog.value += `  Primary blocking factor: Attribute imbalances preventing all swaps\n\n`;
    }
  }

  if (debugLog) {
    if (wasOptimized) {
      debugLog.value += `Integrated optimization complete after ${totalIterations} iterations across ${optimizationRound} round(s)\n`;
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
      debugLog.value += `Final Tier Distribution: FAIR\n\n`;
    } else {
      debugLog.value += `Final Tier Distribution: CONCENTRATED (${finalDistributionIssue})\n\n`;
    }
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
 * Main function: Find optimal team balance using tier-based snake draft
 */
export function findTierBasedTeamBalance(players: TeamAssignment[], permanentGKIds: string[] = []): TierBasedResult {
  let debugLog = '=== TIER-BASED SNAKE DRAFT DEBUG LOG ===\n\n';

  // Add permanent GK section to debug log if any are selected
  if (permanentGKIds.length > 0) {
    debugLog += '⚠️  PERMANENT GOALKEEPERS SELECTED\n';
    debugLog += '===============================\n';
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
  
  // Step 2: Sort players by three-layer rating (descending)
  playersWithRatings.sort((a, b) => b.threeLayerRating - a.threeLayerRating);
  
  debugLog += '\nSTEP 2: SORTED BY THREE-LAYER RATING\n';
  debugLog += '=====================================\n';
  playersWithRatings.forEach((player, index) => {
    debugLog += `${index + 1}. ${player.friendly_name}: ${player.threeLayerRating.toFixed(2)}\n`;
  });

  // Phase 0: Permanent GK Assignment (if any)
  let permanentGKsBlue: PlayerWithRating[] = [];
  let permanentGKsOrange: PlayerWithRating[] = [];
  let regularPlayers = [...playersWithRatings];

  if (permanentGKIds.length > 0) {
    debugLog += '\n🥅 PHASE 0: PERMANENT GOALKEEPER ASSIGNMENT\n';
    debugLog += '==========================================\n';

    // Separate permanent GKs from regular players
    const permanentGKPlayers = playersWithRatings.filter(p => permanentGKIds.includes(p.player_id));
    regularPlayers = playersWithRatings.filter(p => !permanentGKIds.includes(p.player_id));

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
    debugLog += `  Total playersWithRatings: ${playersWithRatings.length}\n`;
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
  const teamSize = Math.floor(playersWithRatings.length / 2);
  const allRatings = playersWithRatings.map(p => p.threeLayerRating);
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
  const confidence = calculateConfidence(playersWithRatings);
  
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
    attributeDiff = Math.abs(blueAttrs.overallScore - orangeAttrs.overallScore);
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
  const bigMovers = playersWithRatings.filter(p => Math.abs(p.threeLayerRating - p.baseSkillRating) > 0.5);
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
  
  // Create the executive summary
  const executiveSummary = `EXECUTIVE SUMMARY
================
Algorithm: Tier-Based Snake Draft
Players: ${executiveSummaryData.totalPlayers} (${executiveSummaryData.ratedPlayers} rated, ${executiveSummaryData.newPlayers} new)
Playstyle Coverage: ${playstyleCoverage}% (${playersWithPlaystyles.length}/${players.length} players rated)
Tiers: ${executiveSummaryData.tierCount} (sizes: ${executiveSummaryData.tierSizes})
Final Balance: ${executiveSummaryData.finalBalance.toFixed(3)} (${executiveSummaryData.balanceQuality} - all skills within ${executiveSummaryData.finalBalance.toFixed(2)})
Optimization: ${executiveSummaryData.optimizationSwaps} swap${executiveSummaryData.optimizationSwaps !== 1 ? 's' : ''} made${executiveSummaryData.optimizationSwaps > 0 ? ` (${wasOptimized ? 'improved balance' : 'no improvement'})` : ''}
Result: Well-balanced teams with fair tier distribution
Advantage: ${executiveSummaryData.teamStrengthAdvantage}`;
  
  // Replace the placeholder with the actual summary
  debugLog = debugLog.replace(executiveSummaryPlaceholder, executiveSummary);
  
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