/**
 * Position Constants
 *
 * Defines all football/soccer positions with their display properties and categorization.
 * Used throughout the application for consistent position handling.
 */

import { Position, PositionConfig, PositionCategory } from '../types/positions';

/**
 * Complete configuration for all 11 standard positions
 * Ordered by category and logical progression on the pitch
 */
export const POSITION_CONFIGS: PositionConfig[] = [
  // Goalkeeper
  {
    code: 'GK',
    label: 'Goalkeeper',
    shortLabel: 'GK',
    category: 'goalkeeper',
    emoji: '🥅',
    defensiveWeight: 'high'
  },

  // Defense
  {
    code: 'LB',
    label: 'Left Back',
    shortLabel: 'LB',
    category: 'defense',
    emoji: '🛡️',
    defensiveWeight: 'high'
  },
  {
    code: 'CB',
    label: 'Center Back',
    shortLabel: 'CB',
    category: 'defense',
    emoji: '🛡️',
    defensiveWeight: 'high'
  },
  {
    code: 'RB',
    label: 'Right Back',
    shortLabel: 'RB',
    category: 'defense',
    emoji: '🛡️',
    defensiveWeight: 'high'
  },
  {
    code: 'LWB',
    label: 'Left Wing Back',
    shortLabel: 'LWB',
    category: 'defense',
    emoji: '🛡️',
    defensiveWeight: 'medium'
  },
  {
    code: 'RWB',
    label: 'Right Wing Back',
    shortLabel: 'RWB',
    category: 'defense',
    emoji: '🛡️',
    defensiveWeight: 'medium'
  },

  // Midfield
  {
    code: 'CDM',
    label: 'Defensive Mid',
    shortLabel: 'CDM',
    category: 'midfield',
    emoji: '⚙️',
    defensiveWeight: 'high'
  },
  {
    code: 'LW',
    label: 'Left Winger',
    shortLabel: 'LW',
    category: 'midfield',
    emoji: '⚙️',
    defensiveWeight: 'medium'
  },
  {
    code: 'CM',
    label: 'Center Mid',
    shortLabel: 'CM',
    category: 'midfield',
    emoji: '⚙️',
    defensiveWeight: 'medium'
  },
  {
    code: 'RW',
    label: 'Right Winger',
    shortLabel: 'RW',
    category: 'midfield',
    emoji: '⚙️',
    defensiveWeight: 'medium'
  },
  {
    code: 'CAM',
    label: 'Attacking Mid',
    shortLabel: 'CAM',
    category: 'midfield',
    emoji: '⚙️',
    defensiveWeight: 'low'
  },

  // Attack
  {
    code: 'ST',
    label: 'Striker',
    shortLabel: 'ST',
    category: 'attack',
    emoji: '⚔️',
    defensiveWeight: 'low'
  }
];

/**
 * Map of position codes to their configurations
 * For quick O(1) lookups
 */
export const POSITION_MAP: Record<Position, PositionConfig> = POSITION_CONFIGS.reduce(
  (acc, config) => ({ ...acc, [config.code]: config }),
  {} as Record<Position, PositionConfig>
);

/**
 * All position codes as an array
 * Useful for iterations and validations
 */
export const ALL_POSITIONS: Position[] = POSITION_CONFIGS.map(c => c.code);

/**
 * Positions grouped by category
 */
export const POSITIONS_BY_CATEGORY: Record<PositionCategory, PositionConfig[]> = {
  goalkeeper: POSITION_CONFIGS.filter(c => c.category === 'goalkeeper'),
  defense: POSITION_CONFIGS.filter(c => c.category === 'defense'),
  midfield: POSITION_CONFIGS.filter(c => c.category === 'midfield'),
  attack: POSITION_CONFIGS.filter(c => c.category === 'attack')
};

/**
 * Category display configuration
 */
export const CATEGORY_CONFIG: Record<PositionCategory, { label: string; emoji: string; order: number }> = {
  goalkeeper: {
    label: 'Goalkeeper',
    emoji: '🥅',
    order: 1
  },
  defense: {
    label: 'Defense',
    emoji: '🛡️',
    order: 2
  },
  midfield: {
    label: 'Midfield',
    emoji: '⚙️',
    order: 3
  },
  attack: {
    label: 'Attack',
    emoji: '⚔️',
    order: 4
  }
};

/**
 * Positions categorized by defensive responsibility
 * Used for team balancing algorithm
 */
export const DEFENSIVE_POSITIONS: Position[] = POSITION_CONFIGS
  .filter(c => c.defensiveWeight === 'high')
  .map(c => c.code);

export const MEDIUM_DEFENSIVE_POSITIONS: Position[] = POSITION_CONFIGS
  .filter(c => c.defensiveWeight === 'medium')
  .map(c => c.code);

export const LOW_DEFENSIVE_POSITIONS: Position[] = POSITION_CONFIGS
  .filter(c => c.defensiveWeight === 'low')
  .map(c => c.code);

/**
 * Thresholds for position consensus classification
 */
export const POSITION_THRESHOLDS = {
  /** Minimum number of raters required before showing position data */
  MIN_RATERS: 5,

  /** Percentage threshold for primary positions (50%+) - STATIC fallback */
  PRIMARY_THRESHOLD: 50,

  /** Percentage threshold for secondary positions (25-49%) */
  SECONDARY_THRESHOLD: 25,

  /** Maximum acceptable gap between teams in any position category (Defenders/Midfielders/Attackers) */
  MAX_POSITION_GAP: 2,

  /** Maximum acceptable gap between teams in any individual position (RWB, CM, ST, etc.) */
  MAX_INDIVIDUAL_POSITION_GAP: 2,

  /** Warning threshold - show warning if selecting more than this many positions */
  MAX_RECOMMENDED_SELECTIONS: 3
} as const;

/**
 * Calculate adaptive minimum raters required based on total participation
 *
 * Scales the minimum rater requirement based on participation level:
 *
 * - 1-3 raters: Require 1+ rater (early adoption)
 * - 4-5 raters: Require 2+ raters (small group quality)
 * - 6-8 raters: Require 3+ raters (medium group quality)
 * - 9+ raters: Require 5+ raters (mature system quality)
 *
 * @param maxTotalRaters - The maximum number of raters in the system
 * @returns Adaptive minimum raters required (1-5)
 *
 * @example
 * getAdaptiveMinRaters(3)  // Returns 1
 * getAdaptiveMinRaters(5)  // Returns 2
 * getAdaptiveMinRaters(7)  // Returns 3
 * getAdaptiveMinRaters(10) // Returns 5
 */
export function getAdaptiveMinRaters(maxTotalRaters: number): number {
  if (maxTotalRaters <= 3) {
    return 1; // Early adoption: accept any position data
  } else if (maxTotalRaters <= 5) {
    return 2; // Small group: require modest agreement
  } else if (maxTotalRaters <= 8) {
    return 3; // Medium group: require solid data
  } else {
    return 5; // Mature phase: standard quality threshold
  }
}

/**
 * Calculate adaptive PRIMARY_THRESHOLD based on total rater participation
 *
 * Uses a progressive threshold that starts lenient for early adoption
 * and becomes stricter as participation grows:
 *
 * - 1-3 raters: 25% threshold (handles vote splitting with few raters)
 * - 4-5 raters: 33% threshold (small group consensus)
 * - 6-8 raters: 40% threshold (medium group consensus)
 * - 9+ raters: 50% threshold (standard majority)
 *
 * This ensures position data is usable during early adoption while
 * maintaining quality standards as the system matures.
 *
 * @param maxTotalRaters - The maximum number of raters for any position
 * @returns Adaptive threshold percentage (25-50)
 *
 * @example
 * getAdaptivePrimaryThreshold(3)  // Returns 25
 * getAdaptivePrimaryThreshold(5)  // Returns 33
 * getAdaptivePrimaryThreshold(7)  // Returns 40
 * getAdaptivePrimaryThreshold(10) // Returns 50
 */
export function getAdaptivePrimaryThreshold(maxTotalRaters: number): number {
  if (maxTotalRaters <= 3) {
    return 25; // Early adoption: handles vote splitting with few raters
  } else if (maxTotalRaters <= 5) {
    return 33; // Small group consensus: need 2+ people agreeing
  } else if (maxTotalRaters <= 8) {
    return 40; // Medium group: solid consensus without being too strict
  } else {
    return 50; // Mature phase: standard majority
  }
}

/**
 * Badge colors for position consensus display
 */
export const POSITION_BADGE_COLORS = {
  primary: 'bg-primary text-primary-content',
  secondary: 'bg-primary/40 text-primary-content',
  mentioned: 'bg-base-300 text-base-content',
  insufficient: 'bg-warning/20 text-warning-content'
} as const;

/**
 * Helper function to get position config by code
 */
export function getPositionConfig(code: Position): PositionConfig | undefined {
  return POSITION_MAP[code];
}

/**
 * Helper function to get position label by code
 */
export function getPositionLabel(code: Position): string {
  return POSITION_MAP[code]?.label || code;
}

/**
 * Helper function to get category positions
 */
export function getPositionsByCategory(category: PositionCategory): PositionConfig[] {
  return POSITIONS_BY_CATEGORY[category] || [];
}

/**
 * Helper function to check if a position code is valid
 */
export function isValidPosition(code: string): code is Position {
  return ALL_POSITIONS.includes(code as Position);
}
