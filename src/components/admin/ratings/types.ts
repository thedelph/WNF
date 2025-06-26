export interface Rating {
  id: string;
  attack_rating: number;
  defense_rating: number;
  game_iq_rating: number;
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
}

export interface Player {
  id: string;
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
  game_iq: number;
  ratings: Rating[];
}

export interface SortConfig {
  key: 'friendly_name' | 'attack_rating' | 'defense_rating' | 'game_iq' | 'game_iq_rating' | 'total_ratings';
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  minAttack: number;
  maxAttack: number;
  minDefense: number;
  maxDefense: number;
  minGameIq: number;
  maxGameIq: number;
  minTotalRatings: number;
}
