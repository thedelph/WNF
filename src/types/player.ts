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
  avatar_svg: string;
  caps: number;
  active_bonuses: string[];
  active_penalties: string[];
  current_streak: number;
  max_streak: number;
  bench_warmer_streak: number;
  player_xp: PlayerXP;
  xp_breakdown: XPBreakdown | null;
  unpaid_games: number;
  win_rates: WinRates | null;
  games_played_together: number;
  my_rating: PlayerRating | null;
  registrationStreak: number;
  registrationStreakApplies: boolean;
  token: {
    status: string;
    lastUsedAt: string | null;
    nextTokenAt: string | null;
    createdAt: string;
    isEligible: boolean;
    recentGames: Array<{
      id: string;
      sequence_number: number;
      date: string;
    }>;
  };
}
