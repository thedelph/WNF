/**
 * Position Classifier Utilities
 *
 * Functions for classifying and analyzing player position consensus data.
 * Used for displaying position information and team balancing.
 */

import {
  Position,
  PositionConsensus,
  ClassifiedPositions,
  TeamPositionDistribution,
  PositionBalanceComparison,
  PlayerWithPositions
} from '../types/positions';
import {
  POSITION_THRESHOLDS,
  POSITIONS_BY_CATEGORY,
  getPositionConfig,
  getAdaptivePrimaryThreshold
} from '../constants/positions';

/**
 * Classify position consensus data into primary, secondary, and mentioned tiers
 *
 * Uses adaptive thresholds based on total rater participation:
 * - 1-3 raters: 33% primary threshold
 * - 4-7 raters: 40% primary threshold
 * - 8+ raters: 50% primary threshold
 *
 * @param consensusData - Array of position consensus data for a player
 * @returns Classified positions with tier assignments
 *
 * @example
 * const consensus = [
 *   { position: 'LB', percentage: 75, ... },
 *   { position: 'CB', percentage: 60, ... },
 *   { position: 'CM', percentage: 40, ... }
 * ];
 * const classified = classifyPositions(consensus);
 * // Result: primary: [LB, CB], secondary: [CM], mentioned: []
 */
export function classifyPositions(consensusData: PositionConsensus[]): ClassifiedPositions {
  const totalRaters = consensusData[0]?.total_raters || 0;
  const hasSufficientData = totalRaters >= POSITION_THRESHOLDS.MIN_RATERS;

  // Calculate adaptive primary threshold based on participation level
  const adaptivePrimaryThreshold = getAdaptivePrimaryThreshold(totalRaters);

  // Filter out positions with 0% rating
  const ratedPositions = consensusData.filter(p => p.percentage > 0);

  return {
    primary: ratedPositions
      .filter(p => p.percentage >= adaptivePrimaryThreshold)
      .sort((a, b) => b.percentage - a.percentage),

    secondary: ratedPositions
      .filter(
        p =>
          p.percentage >= POSITION_THRESHOLDS.SECONDARY_THRESHOLD &&
          p.percentage < adaptivePrimaryThreshold
      )
      .sort((a, b) => b.percentage - a.percentage),

    mentioned: ratedPositions
      .filter(p => p.percentage < POSITION_THRESHOLDS.SECONDARY_THRESHOLD)
      .sort((a, b) => b.percentage - a.percentage),

    totalRaters,
    hasSufficientData
  };
}

/**
 * Get the single highest-rated primary position for a player
 * Used by team balancing algorithm to assign players to categories
 *
 * @param positions - Position consensus data for a player
 * @returns The primary position code, or null if no primary position (< 50% consensus)
 *
 * @example
 * const primary = getPrimaryPosition(consensus);
 * // Returns: 'LB' (if LB has highest % and >= 50%)
 */
export function getPrimaryPosition(positions: PositionConsensus[]): Position | null {
  const classified = classifyPositions(positions);

  if (classified.primary.length === 0) {
    return null;
  }

  // Return the highest percentage primary position
  return classified.primary[0].position;
}

/**
 * Calculate position distribution for a team
 * Groups players by their primary position categories
 *
 * @param players - Array of players with position data
 * @returns Team position distribution counts
 *
 * @example
 * const distribution = calculateTeamPositionDistribution(blueTeam);
 * // Result: { goalkeeper: 0, defense: 3, midfield: 4, attack: 2, versatile: 0, unrated: 0 }
 */
export function calculateTeamPositionDistribution(
  players: PlayerWithPositions[]
): TeamPositionDistribution {
  const distribution: TeamPositionDistribution = {
    goalkeeper: 0,
    defense: 0,
    midfield: 0,
    attack: 0,
    versatile: 0,
    unrated: 0
  };

  for (const player of players) {
    if (!player.positions || player.positions.length === 0) {
      distribution.unrated++;
      continue;
    }

    const classified = classifyPositions(player.positions);

    // If no sufficient data, count as unrated
    if (!classified.hasSufficientData) {
      distribution.unrated++;
      continue;
    }

    // If multiple primary positions, count as versatile
    if (classified.primary.length > 1) {
      distribution.versatile++;
      continue;
    }

    // If no primary positions, count as unrated
    if (classified.primary.length === 0) {
      distribution.unrated++;
      continue;
    }

    // Count by category of primary position
    const primaryPos = classified.primary[0].position;
    const config = getPositionConfig(primaryPos);

    if (!config) {
      distribution.unrated++;
      continue;
    }

    switch (config.category) {
      case 'goalkeeper':
        distribution.goalkeeper++;
        break;
      case 'defense':
        distribution.defense++;
        break;
      case 'midfield':
        distribution.midfield++;
        break;
      case 'attack':
        distribution.attack++;
        break;
    }
  }

  return distribution;
}

/**
 * Compare position balance between two teams
 * Used by team balancing algorithm to evaluate if a swap would create imbalance
 *
 * @param blueTeam - Blue team players with position data
 * @param orangeTeam - Orange team players with position data
 * @returns Position balance comparison with gap analysis
 *
 * @example
 * const balance = comparePositionBalance(blueTeam, orangeTeam);
 * if (!balance.isBalanced) {
 *   console.log(`Imbalanced categories: ${balance.imbalancedCategories.join(', ')}`);
 * }
 */
export function comparePositionBalance(
  blueTeam: PlayerWithPositions[],
  orangeTeam: PlayerWithPositions[]
): PositionBalanceComparison {
  const blueDist = calculateTeamPositionDistribution(blueTeam);
  const orangeDist = calculateTeamPositionDistribution(orangeTeam);

  const goalkeepers = {
    blue: blueDist.goalkeeper,
    orange: orangeDist.goalkeeper,
    gap: Math.abs(blueDist.goalkeeper - orangeDist.goalkeeper)
  };

  const defenders = {
    blue: blueDist.defense,
    orange: orangeDist.defense,
    gap: Math.abs(blueDist.defense - orangeDist.defense)
  };

  const midfielders = {
    blue: blueDist.midfield,
    orange: orangeDist.midfield,
    gap: Math.abs(blueDist.midfield - orangeDist.midfield)
  };

  const attackers = {
    blue: blueDist.attack,
    orange: orangeDist.attack,
    gap: Math.abs(blueDist.attack - orangeDist.attack)
  };

  const maxGap = Math.max(
    goalkeepers.gap,
    defenders.gap,
    midfielders.gap,
    attackers.gap
  );

  const imbalancedCategories: string[] = [];
  if (goalkeepers.gap > POSITION_THRESHOLDS.MAX_POSITION_GAP) {
    imbalancedCategories.push('Goalkeepers');
  }
  if (defenders.gap > POSITION_THRESHOLDS.MAX_POSITION_GAP) {
    imbalancedCategories.push('Defenders');
  }
  if (midfielders.gap > POSITION_THRESHOLDS.MAX_POSITION_GAP) {
    imbalancedCategories.push('Midfielders');
  }
  if (attackers.gap > POSITION_THRESHOLDS.MAX_POSITION_GAP) {
    imbalancedCategories.push('Attackers');
  }

  return {
    goalkeepers,
    defenders,
    midfielders,
    attackers,
    maxGap,
    isBalanced: maxGap <= POSITION_THRESHOLDS.MAX_POSITION_GAP,
    imbalancedCategories
  };
}

/**
 * Format position consensus for display
 * Returns a human-readable string showing position and percentage
 *
 * @param consensus - Position consensus data
 * @param showRawCounts - Whether to show raw counts (e.g., "(6/10)") on hover
 * @returns Formatted string (e.g., "LB 75%")
 *
 * @example
 * formatPositionConsensus({ position: 'LB', percentage: 75.5, rating_count: 6, total_raters: 10 })
 * // Returns: "LB 76%"
 */
export function formatPositionConsensus(
  consensus: PositionConsensus,
  showRawCounts = false
): string {
  const percentage = Math.round(consensus.percentage);
  const config = getPositionConfig(consensus.position);
  const label = config?.shortLabel || consensus.position;

  if (showRawCounts) {
    return `${label} ${percentage}% (${consensus.rating_count}/${consensus.total_raters})`;
  }

  return `${label} ${percentage}%`;
}

/**
 * Get badge color class based on consensus percentage tier
 *
 * @param percentage - Consensus percentage (0-100)
 * @returns Tailwind CSS class string for badge color
 *
 * @example
 * getPositionBadgeColor(75) // Returns: 'bg-primary text-primary-content'
 * getPositionBadgeColor(40) // Returns: 'bg-primary/40 text-primary-content'
 */
export function getPositionBadgeColor(percentage: number): string {
  if (percentage >= POSITION_THRESHOLDS.PRIMARY_THRESHOLD) {
    return 'bg-primary text-primary-content';
  } else if (percentage >= POSITION_THRESHOLDS.SECONDARY_THRESHOLD) {
    return 'bg-primary/40 text-primary-content';
  } else {
    return 'bg-base-300 text-base-content';
  }
}

/**
 * Check if a player has sufficient position ratings to display data
 *
 * @param totalRaters - Total number of raters who have rated this player
 * @returns True if player has enough ratings (>= MIN_RATERS)
 *
 * @example
 * hasSufficientPositionData(3) // Returns: false (need 5)
 * hasSufficientPositionData(5) // Returns: true
 */
export function hasSufficientPositionData(totalRaters: number): boolean {
  return totalRaters >= POSITION_THRESHOLDS.MIN_RATERS;
}

/**
 * Get formatted message for insufficient position data
 *
 * @param totalRaters - Current number of raters
 * @returns Human-readable message (e.g., "Need 2 more raters (3/5)")
 *
 * @example
 * getInsufficientDataMessage(3) // Returns: "Need 2 more raters (3/5)"
 */
export function getInsufficientDataMessage(totalRaters: number): string {
  const needed = POSITION_THRESHOLDS.MIN_RATERS - totalRaters;
  if (needed <= 0) {
    return '';
  }

  const plural = needed === 1 ? 'rater' : 'raters';
  return `Need ${needed} more ${plural} (${totalRaters}/${POSITION_THRESHOLDS.MIN_RATERS})`;
}

/**
 * Validate position selection count
 * Returns warning message if selecting too many positions
 *
 * @param selectedCount - Number of positions selected
 * @returns Warning message if too many, null otherwise
 *
 * @example
 * validatePositionSelectionCount(4)
 * // Returns: "You've selected 4 positions. Consider selecting only the top 3 where this player excels most."
 */
export function validatePositionSelectionCount(selectedCount: number): string | null {
  if (selectedCount <= POSITION_THRESHOLDS.MAX_RECOMMENDED_SELECTIONS) {
    return null;
  }

  return `You've selected ${selectedCount} positions. Consider selecting only the top ${POSITION_THRESHOLDS.MAX_RECOMMENDED_SELECTIONS} where this player excels most.`;
}

/**
 * Get all positions for a specific category
 *
 * @param category - Position category
 * @returns Array of position codes in that category
 *
 * @example
 * getPositionCodesForCategory('defense') // Returns: ['LB', 'CB', 'RB', 'WB']
 */
export function getPositionCodesForCategory(
  category: 'goalkeeper' | 'defense' | 'midfield' | 'attack'
): Position[] {
  return POSITIONS_BY_CATEGORY[category].map(c => c.code);
}

/**
 * Calculate defensive responsibility score for a player
 * Used to complement traditional Attack/Defense ratings
 *
 * @param positions - Position consensus data for a player
 * @returns Score from 0-100 indicating defensive workload
 *
 * @example
 * const defScore = calculateDefensiveResponsibility(consensus);
 * // Returns: 85 (for a player with LB 75%, CB 50% consensus)
 */
export function calculateDefensiveResponsibility(positions: PositionConsensus[]): number {
  const classified = classifyPositions(positions);

  if (!classified.hasSufficientData || classified.primary.length === 0) {
    return 0;
  }

  // Weight by position's defensive responsibility
  let totalScore = 0;
  let totalWeight = 0;

  for (const pos of [...classified.primary, ...classified.secondary]) {
    const config = getPositionConfig(pos.position);
    if (!config) continue;

    const weight = pos.percentage / 100;
    const defensiveValue =
      config.defensiveWeight === 'high' ? 100 :
      config.defensiveWeight === 'medium' ? 50 : 0;

    totalScore += defensiveValue * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}
