// Types for team balancing components
export interface TeamStats {
  avgAttack: number;
  avgDefense: number;
  avgGameIq: number;
  totalAttack: number;
  totalDefense: number;
  totalGameIq: number;
  playerCount: number;
  avgRating: number;
  totalRating: number;
  avgGoalDifferential?: number; // Average goal differential for the team
}

/**
 * Represents a player assigned to a team with their stats
 */
export interface TeamAssignment {
  team: 'blue' | 'orange' | null;
  player_id: string;
  friendly_name: string;
  attack_rating: number | null;
  defense_rating: number | null;
  game_iq_rating: number | null;
  win_rate?: number | null; // Recent win rate (last 10 games)
  goal_differential?: number | null; // Goal differential from last 10 games
  overall_win_rate?: number | null; // Overall career win rate
  overall_goal_differential?: number | null; // Overall career goal differential
  total_games?: number | null; // Add total games count
  tier?: number; // Tier from tier-based snake draft (1-5 typically)
  threeLayerRating?: number; // Three-layer rating from tier system
  // Derived attributes from playstyle ratings
  derived_attributes?: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    // New fields for most common playstyle tracking
    mostCommonPlaystyleId?: string | null;
    mostCommonPlaystyleConfidence?: number | null;
    mostCommonCustomAttributes?: {
      has_pace: boolean;
      has_shooting: boolean;
      has_passing: boolean;
      has_dribbling: boolean;
      has_defending: boolean;
      has_physical: boolean;
    } | null;
    playstyleDistribution?: Record<string, number> | null;
  } | null;
}

export interface TeamComparison {
  attackDiff: number;
  defenseDiff: number;
  ratingDiff: number;
  sizeDiff: number;
}

export interface Game {
  id: string;
  date: string;
  venues: {
    name: string;
  };
  team_assignments?: TeamAssignmentData;
}

export interface TeamAssignmentData {
  teams: TeamAssignment[];
  stats: {
    blue: TeamStats;
    orange: TeamStats;
  };
  selection_metadata: {
    startTime: string;
    endTime: string;
    meritSlots: number;
    randomSlots: number;
    selectionNotes: string[];
  };
}

export interface PlayerSwapSuggestion {
  bluePlayer: TeamAssignment;
  orangePlayer: TeamAssignment;
  attackDiffImprovement: number;
  defenseDiffImprovement: number;
  gameIqDiffImprovement: number;
  winRateDiffImprovement?: number;
  goalDiffImprovement?: number;
  totalDiffImprovement: number;
  primaryImpactMetric?: 'attack' | 'defense' | 'gameIq' | 'winRate' | 'goalDifferential'; // The metric most improved by this swap
}

/**
 * Result from the current optimal team algorithm
 */
export interface OptimalTeamResult {
  blueTeam: TeamAssignment[];
  orangeTeam: TeamAssignment[];
  score: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  unknownPlayerCount: number;
}

/**
 * Result from the tier-based snake draft algorithm
 */
export interface TierBasedTeamResult {
  blueTeam: TeamAssignment[];
  orangeTeam: TeamAssignment[];
  tiers: Array<{
    tierNumber: number;
    players: TeamAssignment[];
    skillRange: { min: number; max: number };
  }>;
  initialScore: number;
  optimizedScore: number;
  wasOptimized: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
}

/**
 * Comparison between two team balancing algorithms
 */
export interface AlgorithmComparison {
  currentAlgorithm: OptimalTeamResult | null;
  tierBasedAlgorithm: TierBasedTeamResult | null;
  metrics: {
    attackDiffCurrent: number;
    attackDiffTierBased: number;
    defenseDiffCurrent: number;
    defenseDiffTierBased: number;
    gameIqDiffCurrent: number;
    gameIqDiffTierBased: number;
    overallScoreCurrent: number;
    overallScoreTierBased: number;
  } | null;
  playerMovements: Array<{
    playerId: string;
    playerName: string;
    currentTeam: 'blue' | 'orange';
    tierBasedTeam: 'blue' | 'orange';
    moved: boolean;
  }>;
}

/**
 * Position types for formation suggestions
 */
export type PositionType = 'DEF' | 'WB' | 'W' | 'CDM' | 'CM' | 'CAM' | 'ST';

/**
 * Position weights for calculating player suitability
 */
export interface PositionWeights {
  attack: number;
  defense: number;
  gameIq: number;
}

/**
 * Player position assignment with score
 */
export interface PlayerPositionAssignment {
  player: TeamAssignment;
  position: PositionType;
  score: number;
  isSpecialist: boolean;
  alternativePositions: Array<{
    position: PositionType;
    score: number;
  }>;
}

/**
 * Formation template defining number of players in each position
 */
export interface FormationTemplate {
  name: string;
  positions: {
    DEF: number;
    WB: number;   // Wingbacks (defensive wide players)
    W: number;    // Wingers (attacking wide players)
    CDM: number;
    CM: number;
    CAM: number;
    ST: number;
  };
  minPlayers: number;
  maxPlayers: number;
}

/**
 * Formation suggestion for a team
 */
export interface FormationSuggestion {
  formation: string;
  positions: {
    DEF: PlayerPositionAssignment[];
    WB: PlayerPositionAssignment[];     // Wingbacks
    W: PlayerPositionAssignment[];      // Wingers
    CDM: PlayerPositionAssignment[];
    CM: PlayerPositionAssignment[];
    CAM: PlayerPositionAssignment[];
    ST: PlayerPositionAssignment[];
  };
  confidence: 'high' | 'medium' | 'low';
  rationale: string[];
  balanceScore: {
    defense: number;
    midfield: number;
    attack: number;
    overall: number;
  };
  debugLog?: FormationDebugLog;
}

/**
 * Debug log entry for formation suggestions
 */
export interface FormationDebugEntry {
  type: 'classification' | 'threshold' | 'suitability' | 'assignment' | 'optimization' | 'balance';
  message: string;
  data?: any;
}

/**
 * Complete debug log for formation generation
 */
export interface FormationDebugLog {
  timestamp: string;
  teamSize: number;
  playerClassifications: Map<string, {
    playerId: string;
    playerName: string;
    type: string;
    ratings: { attack: number; defense: number; gameIq: number; overall: number };
    reason: string;
  }>;
  thresholds: {
    attack: { mean: number; p25: number; p50: number; p75: number; p90: number };
    defense: { mean: number; p25: number; p50: number; p75: number; p90: number };
    gameIq: { mean: number; p25: number; p50: number; p75: number; p90: number };
    overall: { mean: number; p25: number; p50: number; p75: number; p90: number };
  };
  positionMatrix: Array<{
    player: string;
    position: PositionType;
    baseScore: number;
    adjustedScore: number;
    priority: number;
    suitable: boolean;
    suitabilityReason?: string;
  }>;
  assignments: Array<{
    order: number;
    player: string;
    position: PositionType;
    priority: number;
    score: number;
    reason: string;
  }>;
  optimizations: Array<{
    type: string;
    from: { player: string; position: PositionType };
    to: { player: string; position: PositionType };
    reason: string;
  }>;
  finalBalance: {
    defense: number;
    midfield: number;
    attack: number;
    overall: number;
  };
  confidence: 'high' | 'medium' | 'low';
  confidenceReason: string;
}

/**
 * Complete formation result for both teams
 */
export interface FormationResult {
  blueFormation: FormationSuggestion;
  orangeFormation: FormationSuggestion;
  formationNotes: string[];
  debugLog?: {
    blue: FormationDebugLog;
    orange: FormationDebugLog;
  };
  consolidatedDebugLog?: any; // ConsolidatedFormationDebugLog type from formationSuggester
}
