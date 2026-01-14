/**
 * Types for the Brute-Force Optimal Team Balancing Algorithm
 */

/**
 * Core player data from the players table
 */
export interface PlayerStats {
  player_id: string;
  friendly_name: string;
  attack_rating: number | null;
  defense_rating: number | null;
  game_iq: number | null;
  gk: number | null;
  win_rate: number | null; // Overall career win rate
}

/**
 * Recent performance data from RPC functions
 */
export interface PlayerPerformance {
  player_id: string;
  recent_win_rate: number | null;
  recent_goal_differential: number | null;
}

/**
 * Chemistry data between player pairs (same team)
 */
export interface ChemistryPair {
  player1_id: string;
  player2_id: string;
  chemistry_score: number; // 0-100
  games_together: number;
  wins_together: number;
  losses_together: number;
}

/**
 * Rivalry data between player pairs (opposite teams)
 * Measures how players perform AGAINST each other
 */
export interface RivalryPair {
  player1_id: string;
  player2_id: string;
  games_against: number;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  rivalry_score: number; // 0-100: 50 = neutral, >50 = player1 dominates
}

/**
 * Trio chemistry data (3 players on same team)
 * Captures emergent synergies beyond pairwise chemistry
 */
export interface TrioChemistry {
  player1_id: string;
  player2_id: string;
  player3_id: string;
  games_together: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number; // 0-100
  trio_score: number; // 0-100, confidence-weighted
}

/**
 * Position consensus data from peer ratings
 */
export interface PlayerPositionData {
  player_id: string;
  positions: Array<{
    position: string;
    percentage: number;
  }>;
  primary_position: string | null; // Highest percentage position
}

/**
 * Derived attributes from playstyle ratings
 */
export interface PlayerAttributes {
  player_id: string;
  pace: number; // 0-1 based on % of raters who checked has_pace
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

/**
 * Unified player object with all data merged
 */
export interface BruteForcePlayer {
  player_id: string;
  friendly_name: string;
  // Core ratings (default to 5 if null)
  attack: number;
  defense: number;
  gameIq: number;
  gk: number;
  // Computed overall rating for tier sorting
  overallRating: number;
  // Performance metrics
  recentWinRate: number | null;
  recentGoalDiff: number | null;
  overallWinRate: number | null;
  // Position data
  primaryPosition: string | null;
  positions: Array<{ position: string; percentage: number }>;
  // Derived attributes
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

/**
 * Chemistry map for O(1) lookups
 * Key format: "smallerId-largerId" (alphabetically sorted)
 */
export type ChemistryMap = Map<string, ChemistryPair>;

/**
 * Rivalry map for O(1) lookups
 * Key format: "smallerId-largerId" (alphabetically sorted)
 */
export type RivalryMap = Map<string, RivalryPair>;

/**
 * Trio chemistry map for O(1) lookups
 * Key format: "smallestId-middleId-largestId" (sorted)
 */
export type TrioMap = Map<string, TrioChemistry>;

/**
 * All data needed for scoring
 */
export interface ScoringData {
  chemistry: ChemistryMap;
  rivalry: RivalryMap;
  trios: TrioMap;
}

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  coreRatings: number;
  chemistry: number;
  performance: number;
  form: number;
  position: number;
  attributes: number;
}

/**
 * Default scoring weights
 * Note: Performance (15%) + Form (5%) = 20% total for form-related factors
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  coreRatings: 0.40,
  chemistry: 0.20,
  performance: 0.15,
  form: 0.05,
  position: 0.10,
  attributes: 0.10,
};

/**
 * Individual score breakdown for debugging
 */
export interface ScoreBreakdown {
  coreRatings: number;
  chemistry: number;
  // Chemistry sub-components (internal split of 20% chemistry weight)
  chemistryDetails?: {
    pairwise: number;   // Traditional same-team chemistry
    rivalry: number;    // Cross-team matchup balance
    trio: number;       // Trio synergy balance
  };
  performance: number;
  form: number;         // Hot/cold streak balance (recent vs career delta)
  position: number;
  attributes: number;
  total: number;
}

/**
 * Data loading statistics for debugging
 */
export interface DataLoadingStats {
  chemistryPairsLoaded: number;
  rivalryPairsLoaded: number;
  triosLoaded: number;
  playersWithWinRate: number;
  playersWithGoalDiff: number;
  playersWithPosition: number;
  playersWithAttributes: number;
  totalPlayers: number;
}

/**
 * Team result with balance details
 */
export interface BruteForceTeamResult {
  blueTeam: BruteForcePlayer[];
  orangeTeam: BruteForcePlayer[];
  balanceScore: number;
  scoreBreakdown: ScoreBreakdown;
  combinationsEvaluated: number;
  computeTimeMs: number;
  algorithm: 'brute-force-optimal';
  // Tier distribution for verification
  tierDistribution: {
    blue: { top: number; middle: number; bottom: number };
    orange: { top: number; middle: number; bottom: number };
  };
  // Data loading statistics for debugging
  dataLoadingStats: DataLoadingStats;
  // Maps for detailed breakdown (optional, for debug logging)
  chemistryMap?: ChemistryMap;
  rivalryMap?: RivalryMap;
  trioMap?: TrioMap;
}

/**
 * Options for the brute force algorithm
 */
export interface BruteForceOptions {
  permanentGKId?: string;
  weights?: Partial<ScoringWeights>;
  debug?: boolean;
}

/**
 * Position categories for coverage checking
 */
export type PositionCategory = 'DEF' | 'MID' | 'ATT';

/**
 * Position to category mapping
 */
export const POSITION_CATEGORIES: Record<string, PositionCategory> = {
  // Defenders
  LB: 'DEF',
  CB: 'DEF',
  RB: 'DEF',
  // Midfielders (including wing-backs and wide mids)
  LWB: 'MID',
  RWB: 'MID',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  LW: 'MID',
  RW: 'MID',
  // Attackers
  ST: 'ATT',
};
