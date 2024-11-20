export interface Venue {
  id: string
  name: string
  address: string
}

export interface GameRegistration {
  id: string
  game_id: string
  player_id: string
  status: 'registered' | 'selected' | 'reserve' | 'cancelled'
  randomly_selected: boolean
  players?: Player
}

export interface Game {
  id: string
  date: string
  status: 'open' | 'upcoming' | 'pending_teams' | 'teams_announced'
  max_players: number
  random_slots: number
  registration_window_end: string
  venue?: Venue
  game_registrations?: GameRegistration[]
}

export interface Player {
  id: string
  friendly_name: string
  caps: number
  active_bonuses: number
  active_penalties: number
  current_streak: number
}
