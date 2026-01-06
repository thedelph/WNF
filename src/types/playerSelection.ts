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
    game_iq_rating: number;
    gk_rating: number;
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
  averagedPlaystyle?: string;
  playstyleMatchDistance?: number;
  playstyleCategory?: 'attacking' | 'midfield' | 'defensive';
  playstyleRatingsCount?: number;
  unpaidGames?: number;
  unpaidGamesModifier?: number;
  recentGames?: number;
  // Shield protection properties
  shieldActive?: boolean;
  frozenStreakValue?: number | null;
  // Mapped/transformed properties (camelCase versions)
  friendlyName?: string;
  avatarSvg?: string;
  activeBonuses?: number;
  activePenalties?: number;
  currentStreak?: number;
  maxStreak?: number;
  winRate?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  totalGames?: number;
  rarity?: string;
  rank?: number;
  potentialOfferTimes?: any;
  hasActiveSlotOffers?: boolean;
  gameParticipation?: Array<'selected' | 'reserve' | null>;
}

// Registration-specific type used in GameRegistrations.tsx
export interface RegistrationPlayerData {
  id: string;
  gameId: string;
  playerId: string;
  status: 'registered' | 'selected' | 'reserve' | 'dropped_out';
  selectionMethod: string | null;
  team: 'blue' | 'orange' | null;
  usingToken: boolean;
  shieldTokensAvailable: number;
  player: {
    id: string;
    friendlyName: string;
    xp: number;
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    winRate: number;
    currentStreak: number;
    maxStreak: number;
    avatarSvg: string;
    rarity: string;
  };
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
