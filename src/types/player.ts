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

export interface GameHistoryItem {
  sequence: number;
  status: 'selected' | 'reserve' | 'not_selected';
}

export interface PlayerStats {
  id: string;
  user_id: string;
  friendly_name: string;
  avatar_svg: string | null;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  max_streak: number;
  max_streak_date?: string;
  xp: number;
  highest_xp?: number;
  highest_xp_date?: string;
  wins?: number;
  totalGames?: number;
  win_rate?: number;
  recent_win_rate?: number;
  recent_wins?: number; 
  recent_draws?: number;
  recent_losses?: number;
  rarity: string;
  whatsapp_group_member?: string;
  gameHistory?: {
    sequence?: number;
    status: string;
  }[];
  games_played_together?: number;
  my_rating?: {
    attack_rating: number;
    defense_rating: number;
    game_iq_rating: number;
  } | null;
  reserveXP?: number;
  reserveCount?: number;
  bench_warmer_streak?: number;
  unpaidGames?: number;
  registrationStreak?: number;
  registrationStreakApplies?: boolean;
  token_status?: {
    status: string;
    last_used_at: string | null;
    next_token_at: string | null;
    created_at: string;
    is_eligible?: boolean;
    recent_games?: { id: string; sequence_number: number; date: string }[];
  };
}
