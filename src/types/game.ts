export const GAME_STATUSES = {
  OPEN: 'open',
  UPCOMING: 'upcoming',
  PLAYERS_ANNOUNCED: 'players_announced',  // After registration closes, players are selected
  TEAMS_ANNOUNCED: 'teams_announced',      // After team announcement time, teams are balanced
  COMPLETED: 'completed'
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
  status: 'registered' | 'selected' | 'reserve' | 'cancelled'
  team?: 'blue' | 'orange' | null
  randomly_selected: boolean
  created_at: string
  player?: Player
}

export interface Game {
  id: string
  date: string
  status: string
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
  game_registrations: Array<{
    id: string
    status: string
    randomly_selected: boolean
    registered_player: {
      id: string
      friendly_name: string
      caps: number
      active_bonuses: number
      active_penalties: number
      current_streak: number
    }
  }>
}

export interface Player {
  id: string
  friendly_name: string
  caps: number
  active_bonuses: number
  active_penalties: number
  current_streak: number
  preferred_position?: string
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
