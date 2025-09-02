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
export type PositionType = 'DEF' | 'W' | 'CDM' | 'CM' | 'CAM' | 'ST';

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
    W: number;    // Wingers
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
    W: PlayerPositionAssignment[];    // Wingers
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
}

/**
 * Complete formation result for both teams
 */
export interface FormationResult {
  blueFormation: FormationSuggestion;
  orangeFormation: FormationSuggestion;
  formationNotes: string[];
}
