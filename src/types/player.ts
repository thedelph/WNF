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
  highest_xp_v2?: number;
  highest_xp_date?: string;
  is_highest_xp_v1_era?: boolean;
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
    sequence: number;
    status: string;
  }[];
  games_played_together?: number;
  my_rating?: {
    attack_rating: number;
    defense_rating: number;
    game_iq_rating: number;
    gk_rating: number;
  } | null;
  reserveXP?: number;
  reserve_xp?: number;
  reserveCount?: number;
  reserve_games?: number;
  bench_warmer_streak?: number;
  unpaidGames?: number;
  registrationStreak?: number;
  registrationStreakApplies?: boolean;
  token_status?: {
    status: string;
    lastUsedAt?: string | null;
    last_used_at?: string | null;
    nextTokenAt?: string | null;
    next_token_at?: string | null;
    createdAt?: string;
    created_at?: string;
    isEligible?: boolean;
    is_eligible?: boolean;
    recentGames?: { display: string; status: 'selected' | 'dropped_out' }[];
    recent_games?: { display: string; status: 'selected' | 'dropped_out' }[];
    hasPlayedInLastTenGames?: boolean;
    hasRecentSelection?: boolean;
    hasOutstandingPayments?: boolean;
    outstandingPaymentsCount?: number;
    whatsappGroupMember?: boolean;
  };
  // Injury token fields (from players table)
  injury_token_active?: boolean;
  injury_original_streak?: number | null;
  injury_return_streak?: number | null;
  injury_activated_at?: string | null;
  injury_game_id?: string | null;
}
