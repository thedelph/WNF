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
  attack_rating: number;
  defense_rating: number;
  game_iq_rating: number;
  win_rate?: number | null; // Allow win rate to be null for players with no game history
  goal_differential?: number | null; // Goal differential from last 10 games
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
