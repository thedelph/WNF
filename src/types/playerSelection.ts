export interface PlayerStats {
  id: string;
  friendly_name: string;
  preferred_position: string | null;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  max_streak: number;
  bench_warmer_streak: number;
  win_rate: number;
  xp: number;
  avatar_svg?: string;
  game_sequences?: number[];
  latest_sequence?: number;
  my_rating?: {
    attack_rating: number;
    defense_rating: number;
  } | null;
  games_played_together?: number;
}

export interface Player {
  id: string;
  friendly_name: string;
  isRandomlySelected?: boolean;
  selectionMethod?: string;
  stats?: PlayerStats;
  caps?: number;
  active_bonuses?: number;
  active_penalties?: number;
  current_streak?: number;
  max_streak?: number;
  avatar_svg?: string;
  whatsapp_group_member?: boolean;
  unpaid_games?: number;
  unpaid_games_modifier?: number;
}

export interface ExtendedPlayerData extends PlayerStats {
  isRandomlySelected?: boolean;
  hasSlotOffer?: boolean;
  slotOfferStatus?: 'pending' | 'declined';
  slotOfferExpiresAt?: string; 
  slotOfferAvailableAt?: string; 
  slotOffers?: {
    status: string;
    expires_at?: string;
    available_at?: string;
  }[];
  whatsapp_group_member?: string;
  benchWarmerStreak?: number;  
  registrationStreakBonus?: number; 
  registrationStreakBonusApplies?: boolean; 
  using_token?: boolean; 
  had_token?: boolean; 
  status?: 'selected' | 'reserve' | 'dropped_out' | 'none'; 
}

export interface PlayerSelectionResultsProps {
  gameId: string;
  selectedPlayers: Array<{
    player: Player;
    selection_type: string;
    team: string;
  }>;
  reservePlayers: Player[];
  onClose?: () => void;
}

export interface TeamSelectionResultsProps {
  gameId: string;
  blueTeam: Player[];
  orangeTeam: Player[];
  reservePlayers: Player[];
}

export interface ReservePlayer {
  player_id: string;
  status: string;
  created_at: string;
  players: {
    id: string;
    friendly_name: string;
    caps: number;
    active_bonuses: number;
    active_penalties: number;
    current_streak: number;
  };
}
