// Types for team balancing components
export interface TeamStats {
  avgAttack: number;
  avgDefense: number;
  totalAttack: number;
  totalDefense: number;
  playerCount: number;
  avgRating: number;
  totalRating: number;
}

export interface TeamAssignment {
  player_id: string;
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
  win_rate?: number | null; // Allow win rate to be null for players with no game history
  total_games?: number | null; // Add total games count
  team: 'blue' | 'orange' | null;
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
  totalDiffImprovement: number;
}
