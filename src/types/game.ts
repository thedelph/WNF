export const GAME_STATUSES = {
  OPEN: 'open',
  UPCOMING: 'upcoming',
  PENDING_TEAMS: 'pending_teams',
  TEAMS_ANNOUNCED: 'teams_announced',
  PLAYERS_ANNOUNCED: 'players_announced',
  COMPLETED: 'completed'
} as const;

export type GameStatus = (typeof GAME_STATUSES)[keyof typeof GAME_STATUSES];

export interface Venue {
  id: string
  name: string
  address: string
  google_maps_url?: string
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
  GAME_STATUSES.PENDING_TEAMS,
  GAME_STATUSES.TEAMS_ANNOUNCED,
  GAME_STATUSES.PLAYERS_ANNOUNCED,
] as const
