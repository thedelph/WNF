export interface Rating {
  id: string;
  attack_rating: number;
  defense_rating: number;
  created_at: string;
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
  ratings: Rating[];
}

export interface SortConfig {
  key: 'friendly_name' | 'attack_rating' | 'defense_rating' | 'total_ratings';
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  minAttack: number;
  maxAttack: number;
  minDefense: number;
  maxDefense: number;
  minTotalRatings: number;
}
