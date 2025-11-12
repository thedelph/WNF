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
    code: 'WB',
    label: 'Wing Back',
    shortLabel: 'WB',
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

  /** Percentage threshold for primary positions (50%+) */
  PRIMARY_THRESHOLD: 50,

  /** Percentage threshold for secondary positions (25-49%) */
  SECONDARY_THRESHOLD: 25,

  /** Maximum acceptable gap between teams in any position category (team balancing) */
  MAX_POSITION_GAP: 2,

  /** Warning threshold - show warning if selecting more than this many positions */
  MAX_RECOMMENDED_SELECTIONS: 3
} as const;

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
