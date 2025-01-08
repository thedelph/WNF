export interface Player {
  id: string
  friendly_name: string
  // ... other player fields
}

interface PlayerProfile {
  id: string
  user_id: string
  friendly_name: string
  xp: number
  caps: number
  preferred_position: string
  current_streak: number
  max_streak: number
  win_rate: number
  avatar_svg?: string
  avatar_options?: any
  // Add any other fields that exist in your database
}

export interface PlayerStats {
  id: string;
  user_id: string;
  friendly_name: string;
  avatar_svg?: string;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  max_streak: number;
  xp: number;
  win_rate: number;
  game_sequences: number[];
  games_played_together?: number;
  my_rating?: {
    attack_rating: number;
    defense_rating: number;
  } | null;
}
