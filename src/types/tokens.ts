export interface TokenData {
  id: string;
  player_id: string;
  friendly_name: string;
  whatsapp_group_member: string;
  is_eligible: boolean;
  reason?: string; // Reason for ineligibility
  selected_games: Array<{
    id: string;
    date: string;
    display: string;
    sequence_number?: number; // For checking consecutive games
  }>;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_game_id: string | null;
}

// =====================================================
// Injury Token Types
// =====================================================

export type InjuryTokenStatus = 'active' | 'returned' | 'denied' | 'expired';

export interface InjuryTokenUsage {
  id: string;
  player_id: string;
  injury_game_id: string;
  activated_at: string;
  original_streak: number;
  return_streak: number;
  status: InjuryTokenStatus;
  returned_at: string | null;
  return_game_id: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denied_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InjuryTokenHistory {
  id: string;
  player_id: string;
  action_type: 'activated' | 'returned' | 'denied' | 'admin_activated' | 'expired';
  injury_game_id: string | null;
  return_game_id: string | null;
  original_streak: number | null;
  return_streak: number | null;
  notes: string | null;
  initiated_by: string | null;
  created_at: string;
}

export interface InjuryTokenStatusData {
  isActive: boolean;
  originalStreak: number | null;
  returnStreak: number | null;
  activatedAt: string | null;
  injuryGameId: string | null;
  injuryGameDate: string | null;
  injuryGameNumber: number | null;
  gamesMissed: number | null;
}

export interface InjuryTokenEligibility {
  eligible: boolean;
  reason: string;
  currentStreak: number;
  effectiveStreak: number;
  returnStreak: number;
  hasActiveShield: boolean;
}

export interface EligibleInjuryGame {
  gameId: string;
  gameDate: string;
  sequenceNumber: number;
  eligible: boolean;
  reason: string;
}

export interface InjuryTokenStats {
  activeCount: number;
  thisMonthCount: number;
  totalReturned: number;
  totalDenied: number;
  avgGamesMissed: number;
}

export interface InjuryTokenClaim {
  id: string;
  playerId: string;
  playerName: string;
  injuryGameId: string;
  injuryGameDate: string;
  injuryGameNumber: number;
  originalStreak: number;
  returnStreak: number;
  status: InjuryTokenStatus;
  activatedAt: string;
  returnedAt: string | null;
  gamesMissed: number;
}
