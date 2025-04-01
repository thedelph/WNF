export const GAME_STATUSES = {
  OPEN: 'open',
  UPCOMING: 'upcoming',
  PLAYERS_ANNOUNCED: 'players_announced',
  TEAMS_ANNOUNCED: 'teams_announced',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type GameStatus = (typeof GAME_STATUSES)[keyof typeof GAME_STATUSES];

export interface Venue {
  id: string
  name: string
  address: string
  google_maps_url?: string
}

export interface VenuePreset {
  id: string
  name: string
  venue_id: string
  day_of_week: string
  start_time: string
  registration_hours_before: number
  registration_hours_until: number
  team_announcement_hours: number
  pitch_cost: number
}

export interface GameRegistration {
  id: string
  game_id: string
  player_id: string
  status: 'registered' | 'selected' | 'reserve' | 'dropped_out'
  team?: 'blue' | 'orange' | null
  selection_method: 'merit' | 'random' | 'none'
  created_at: string
  paid: boolean
  payment_status?: 'pending' | 'admin_verified' | 'player_verified'
  payment_received_date?: string
  payment_verified_at?: string
  payment_verified_by?: string
  payment_recipient_id?: string
  is_reserve: boolean
  payment_required: boolean
  player?: Player
  using_token?: boolean // Whether the player is using a priority token for this game
}

export interface Game {
  id: string
  date: string
  status: GameStatus
  max_players: number
  random_slots: number
  registration_window_start: string
  registration_window_end: string
  team_announcement_time: string
  teams_announced: boolean
  sequence_number?: number   // WNF sequence number
  score_blue?: number       // Blue team's score
  score_orange?: number     // Orange team's score
  outcome?: 'blue_win' | 'orange_win' | 'draw' | null  // Game outcome
  venue: {
    id: string
    name: string
    address: string
    google_maps_url: string
  }
  game_registrations: Array<GameRegistration>
  pitch_cost: number
  payment_link?: string
  cost_per_person?: number
}

export interface AdminPermission {
  permission: string;
}

export interface AdminRole {
  id: string;
  admin_permissions: AdminPermission[];
}

export interface Player {
  id: string;
  friendly_name: string;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  admin_role?: AdminRole;
  isAdmin?: boolean;
}

export interface GameHistory {
  team: string;
  games: {
    id: string;
    date: string;
    score_blue: number | null;
    score_orange: number | null;
    outcome: 'blue_win' | 'orange_win' | 'draw' | null;
    blue_team_size: number;  // Number of players on blue team
    orange_team_size: number;  // Number of players on orange team
  };
}

export const isValidGameStatus = (status: string): status is GameStatus => {
  return Object.values(GAME_STATUSES).includes(status as GameStatus)
}

export const ACTIVE_GAME_STATUSES = [
  GAME_STATUSES.OPEN,
  GAME_STATUSES.UPCOMING,
  GAME_STATUSES.PLAYERS_ANNOUNCED,
  GAME_STATUSES.TEAMS_ANNOUNCED,
] as const

export type NotificationType = 
  | 'game_created'
  | 'game_cancelled'
  | 'team_announced'
  | 'game_reminder'
  | 'payment_request'
  | 'payment_confirmed'
  | 'registration_confirmed'
  | 'registration_removed'
  | 'bonus_earned'
  | 'penalty_earned'
  | 'system_announcement'
  | 'slot_offer'  // Added this type to match the database

export interface GameFormData {
  date: string;
  time: string;
  venue: string;
  pitchCost: number;
  maxPlayers: number;
  randomSlots: number;
  phase: GameStatus;
  confirmedPlayers: string[];
  reservePlayers: string[];
  randomPickPlayers: string[];
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAAttackRating: number;
  teamADefenseRating: number;
  teamBAttackRating: number;
  teamBDefenseRating: number;
}
