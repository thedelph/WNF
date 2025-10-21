export interface PlayerProfile {
  friendly_name: string;
  current_stored_xp: number;
  base_xp: number;
  reserve_xp: number;
  reserve_games: number;
  subtotal_before_modifiers: number;
  attendance_streak: number;
  attendance_streak_modifier: number;
  reserve_game_modifier: number;
  registration_streak: number;
  registration_streak_modifier: number;
  unpaid_games_count: number;
  unpaid_games_modifier: number;
  total_xp: number;
  rarity?: string;
  current_streak?: number;
  max_streak?: number;
  avatar_svg?: string | null;
  avatar_options?: any;
  token?: {
    status: string;
    last_used_at: string | null;
    next_token_at: string | null;
    created_at: string;
  };
  status: string;
  last_used_at: string | null;
  next_token_at: string | null;
  created_at: string;
}

export interface ExtendedPlayerData {
  id: string;
  user_id: string;
  friendly_name: string;
  avatar_svg: string | null;
  avatar_options: any;
  current_streak: number;
  max_streak: number;
  xp: number;
  total_xp?: number;
  rank: number;
  rarity: string;
  reserveXP: number;
  whatsapp_group_member: string | null;  // 'Yes', 'No', 'Proxy', or null
  whatsapp_mobile_number?: string | null;
  registration_streak?: number;
  gameSequences?: Array<{
    sequence: number;
    status: string;
    team: string;
  }>;
  win_rate?: number;
  recent_win_rate?: number;
  highestXP?: number;
  highestXPSnapshotDate?: string;
  maxStreakDate?: string;
  caps?: number;
  reserve_games?: number;
  bench_warmer_streak?: number;
  registrationStreak?: number;
  registrationStreakApplies?: boolean;
  unpaidGames?: number;
  latestSequence?: number;
  averagedPlaystyle?: string;
  playstyleMatchDistance?: number;
  playstyleCategory?: 'attacking' | 'midfield' | 'defensive';
  playstyleRatingsCount?: number;
}
