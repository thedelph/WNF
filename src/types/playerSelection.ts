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
}

export interface ExtendedPlayerData extends PlayerStats {
  isRandomlySelected?: boolean;
  hasSlotOffer?: boolean;
  slotOfferStatus?: 'pending' | 'declined';
  slotOfferExpiresAt?: string; // When exclusive access ends
  slotOfferAvailableAt?: string; // When the offer became available
  slotOffers?: {
    status: string;
    expires_at?: string;
    available_at?: string;
  }[];
  whatsapp_group_member?: string;
  benchWarmerStreak?: number;  // Add this for consistency with PlayerCard props
  registrationStreakBonus?: number; // Current registration streak length
  registrationStreakBonusApplies?: boolean; // Whether the bonus should be applied
  using_token?: boolean; // Whether the player is using a token for this game
  had_token?: boolean; // Whether the player used a token but had it returned due to merit selection
  status?: 'selected' | 'reserve' | 'dropped_out' | 'none'; // Player's status in the latest game
}

export interface PlayerSelectionResultsProps {
  selectedPlayers: ExtendedPlayerData[];
  onClose: () => void;
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
