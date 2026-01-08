/**
 * Position Rating System Types
 *
 * Defines types and interfaces for the player position preference rating system.
 * Players can be rated on where they excel on the pitch across 11 standard outfield positions.
 *
 * Note: GK is not included as a position preference due to the rotating goalkeeper system.
 * GK ratings (0-10) remain as one of the four core skill metrics.
 */

/**
 * Standard football/soccer outfield positions
 *
 * Categories:
 * - Defense: LB, CB, RB, LWB (Left Wing Back), RWB (Right Wing Back)
 * - Midfield: LW (Left Winger), CM, RW (Right Winger), CAM (Attacking Mid), CDM (Defensive Mid)
 * - Attack: ST (Striker)
 */
export type Position = 'LB' | 'CB' | 'RB' | 'LWB' | 'RWB' | 'LW' | 'CM' | 'RW' | 'CAM' | 'CDM' | 'ST';

/**
 * Position categories for grouping positions
 */
export type PositionCategory = 'defense' | 'midfield' | 'attack';

/**
 * Configuration for a single position
 * Used to define display properties and categorization
 */
export interface PositionConfig {
  /** Position code (e.g., 'ST', 'CM') */
  code: Position;

  /** Full display name (e.g., 'Striker', 'Center Mid') */
  label: string;

  /** Abbreviated name for compact display (e.g., 'STR', 'CM') */
  shortLabel?: string;

  /** Category this position belongs to */
  category: PositionCategory;

  /** Emoji icon for visual display */
  emoji: string;

  /** Defensive responsibility level (for team balancing) */
  defensiveWeight: 'high' | 'medium' | 'low';
}

/**
 * Individual position rating from a single rater
 * Represents one rater ranking one position for one player
 * Rank: 1 (best/3pts), 2 (secondary/2pts), 3 (tertiary/1pt)
 */
export interface PositionRating {
  id: string;
  rater_id: string;
  rated_player_id: string;
  position: Position;
  rank: 1 | 2 | 3;  // Position rank: 1st=3pts, 2nd=2pts, 3rd=1pt
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated consensus data for a position
 * Shows weighted percentage based on ranked selections (1st=3pts, 2nd=2pts, 3rd=1pt)
 */
export interface PositionConsensus {
  player_id: string;
  position: Position;
  rating_count: number;    // How many raters selected this position (at any rank)
  total_raters: number;    // Total raters who rated this player
  percentage: number;      // (points / (total_raters * 6)) * 100 (max 6 points per rater)
  points: number;          // Total weighted points for this position
  rank_1_count: number;    // Count of 1st choice selections (3 points each)
  rank_2_count: number;    // Count of 2nd choice selections (2 points each)
  rank_3_count: number;    // Count of 3rd choice selections (1 point each)
  updated_at: string;
}

/**
 * Classified position consensus
 * Groups positions into primary, secondary, and mentioned tiers
 */
export interface ClassifiedPositions {
  /** Primary positions (50%+ consensus) */
  primary: PositionConsensus[];

  /** Secondary positions (25-49% consensus) */
  secondary: PositionConsensus[];

  /** Mentioned positions (<25% consensus, but >0%) */
  mentioned: PositionConsensus[];

  /** Total number of raters who have rated this player */
  totalRaters: number;

  /** Whether this player has enough ratings to show position data (5+ raters) */
  hasSufficientData: boolean;
}

/**
 * Position distribution for a team
 * Used by the team balancing algorithm
 *
 * Note: 'goalkeeper' field tracks GK rating metric for team balance,
 * not GK position preference (which doesn't exist due to rotating keeper system)
 */
export interface TeamPositionDistribution {
  goalkeeper: number;     // Players with high GK ratings (for GK rating balance only)
  defense: number;        // Players with defensive positions (LB, CB, RB, LWB, RWB) as primary
  midfield: number;       // Players with midfield positions (LW, CM, RW, CAM, CDM) as primary
  attack: number;         // Players with attacking positions (ST) as primary
  versatile: number;      // Players with multiple primary positions
  unrated: number;        // Players without position consensus
}

/**
 * Position balance comparison between two teams
 * Used to evaluate if a swap would create position imbalance
 */
export interface PositionBalanceComparison {
  goalkeepers: {
    blue: number;
    orange: number;
    gap: number;
  };
  defenders: {
    blue: number;
    orange: number;
    gap: number;
  };
  midfielders: {
    blue: number;
    orange: number;
    gap: number;
  };
  attackers: {
    blue: number;
    orange: number;
    gap: number;
  };
  maxGap: number;           // Largest gap across all categories
  isBalanced: boolean;       // True if maxGap <= 2
  imbalancedCategories: string[];  // Names of categories with gap > 2
}

/**
 * Player with position consensus data attached
 * Extends the base player type with position information
 */
export interface PlayerWithPositions {
  /** Player identifier - supports both 'id' and 'player_id' for compatibility */
  id?: string;
  player_id?: string;
  friendly_name: string;

  /** Position consensus data for this player */
  positions?: PositionConsensus[];

  /** Classified positions (primary/secondary/mentioned) */
  classifiedPositions?: ClassifiedPositions;

  /** Single primary position for team balancing (highest percentage >=50%) */
  primaryPosition?: Position | null;
}

/**
 * Position rating submission data
 * Used when submitting new ranked position ratings
 */
export interface PositionRatingSubmission {
  rater_id: string;
  rated_player_id: string;
  positions: {
    first?: Position;    // 1st choice (3 points)
    second?: Position;   // 2nd choice (2 points)
    third?: Position;    // 3rd choice (1 point)
  };
}

/**
 * Position consensus query result
 * What the database returns when fetching consensus data
 */
export interface PositionConsensusQueryResult {
  player_id: string;
  position: Position;
  rating_count: number;
  total_raters: number;
  percentage: number;
  points: number;
  rank_1_count: number;
  rank_2_count: number;
  rank_3_count: number;
  updated_at: string;
}

/**
 * Admin view: Position heatmap data
 * Shows all players × all positions for admin interface
 */
export interface PositionHeatmapData {
  player_id: string;
  player_name: string;
  positions: {
    [K in Position]?: {
      percentage: number;
      ratingCount: number;
      totalRaters: number;
    };
  };
  totalRaters: number;
  hasSufficientData: boolean;
}
