import { Position, PositionConsensus } from '../../../types/positions';

export interface Rating {
  id: string;
  attack_rating: number;
  defense_rating: number;
  game_iq_rating: number;
  gk_rating: number;
  created_at: string;
  updated_at?: string;
  rater: {
    id: string;
    friendly_name: string;
    is_admin: boolean;
  };
  rated_player: {
    id: string;
    friendly_name: string;
  };
  // Previous rating values from history
  previous_attack_rating?: number;
  previous_defense_rating?: number;
  previous_game_iq_rating?: number;
  previous_gk_rating?: number;
  previous_playstyle_id?: string | null;
  // Playstyle information
  playstyle?: {
    id: string;
    name: string;
    category: 'attacking' | 'midfield' | 'defensive';
  } | null;
  playstyle_id?: string | null;
  // Previous playstyle information
  previous_playstyle?: {
    id: string;
    name: string;
    category: 'attacking' | 'midfield' | 'defensive';
  } | null;
  // Position preferences (ranked system)
  position_1st?: Position | null;
  position_2nd?: Position | null;
  position_3rd?: Position | null;
  // Previous position values from history
  previous_position_1st?: Position | null;
  previous_position_2nd?: Position | null;
  previous_position_3rd?: Position | null;
}

/**
 * Represents a rating given by a rater (used in rater statistics)
 */
export interface RatingGiven {
  id: string;
  attack_rating: number;
  defense_rating: number;
  game_iq_rating: number;
  gk_rating: number;
  created_at: string;
  updated_at?: string;
  playstyle_id?: string | null;
  playstyle?: {
    id: string;
    name: string;
    category: 'attacking' | 'midfield' | 'defensive';
  } | null;
  rated_player: {
    id: string;
    friendly_name: string;
  };
  rater: {
    id: string;
    friendly_name: string;
    is_admin: boolean;
  };
  position_1st?: Position | null;
  position_2nd?: Position | null;
  position_3rd?: Position | null;
}

export interface Player {
  id: string;
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
  game_iq: number;
  average_gk_rating: number;
  ratings: Rating[];
  // Ratings given by this player (when used as a rater)
  ratings_given?: RatingGiven[];
  // Derived attributes from playstyle ratings
  derived_attributes?: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
  // Position consensus data (aggregated from all raters)
  position_consensus?: PositionConsensus[];
}

export interface SortConfig {
  key: 'friendly_name' | 'attack_rating' | 'defense_rating' | 'game_iq' | 'game_iq_rating' | 'gk_rating' | 'average_gk_rating' | 'total_ratings';
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  minAttack: number;
  maxAttack: number;
  minDefense: number;
  maxDefense: number;
  minGameIq: number;
  maxGameIq: number;
  minGk: number;
  maxGk: number;
  minTotalRatings: number;
  selectedPositions: Position[]; // Filter by primary positions (>=50% consensus)
}
