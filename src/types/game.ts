import { Player } from './player'
import type { Venue } from './venue'

export type { Player } from './player'
export type { Venue } from './venue'

export type GameStatus = 'upcoming' | 'open' | 'players_announced' | 'teams_announced' | 'completed'

export const GAME_STATUSES: Record<string, GameStatus> = {
  UPCOMING: 'upcoming',
  OPEN: 'open',
  PLAYERS_ANNOUNCED: 'players_announced',
  TEAMS_ANNOUNCED: 'teams_announced',
  COMPLETED: 'completed'
} as const

export type GameOutcome = 'blue_win' | 'orange_win' | 'draw' | null

export interface Game {
  id: string
  date: string
  status: GameStatus
  maxPlayers: number
  randomSlots: number
  registrationWindowStart: string
  registrationWindowEnd: string
  teamAnnouncementTime: string
  gameNumber?: number
  scoreBlue?: number
  scoreOrange?: number
  outcome?: GameOutcome
  venue?: Venue
  gameRegistrations?: GameRegistration[]
  isRegistrationClosed?: boolean
  isTeamAnnouncementTime?: boolean
  isRegistrationOpen?: boolean
}

export interface GameRegistration {
  id: string
  gameId: string
  playerId: string
  status: 'confirmed' | 'reserve' | 'dropped_out'
  team?: 'blue' | 'orange'
  player?: Player
}

export interface GameDBResponse {
  id: string
  date: string
  status: string
  max_players: number
  random_slots: number
  registration_window_start: string
  registration_window_end: string
  team_announcement_time: string
  game_number?: number
  score_blue?: number
  score_orange?: number
  outcome?: string
  game_registrations?: GameRegistrationDBResponse[]
  venue?: Venue
}

export interface GameRegistrationDBResponse {
  id: string
  game_id: string
  player_id: string
  status: string
  team?: string
  player?: {
    id: string
    friendly_name: string
    has_declined?: boolean
    has_offer?: boolean
  }
}

export interface VenuePreset {
  id: string
  name: string
  venueId: string
  dayOfWeek: string
  startTime: string
  registrationHoursBefore: number
  registrationHoursUntil: number
  teamAnnouncementHours: number
  pitchCost: number
}

export interface TeamAssignment {
  blueTeam: string[]
  orangeTeam: string[]
}

export interface GameWithRelations extends Game {
  venue?: Venue
  gameRegistrations?: GameRegistration[]
}

export const ACTIVE_GAME_STATUSES = [
  GAME_STATUSES.OPEN,
  GAME_STATUSES.UPCOMING,
  GAME_STATUSES.PLAYERS_ANNOUNCED,
  GAME_STATUSES.TEAMS_ANNOUNCED
]

export function isValidGameStatus(status: string): status is GameStatus {
  return Object.values(GAME_STATUSES).includes(status as GameStatus)
}

export function transformGameFromDB(game: GameDBResponse): Game {
  return {
    id: game.id,
    date: game.date,
    status: game.status as GameStatus,
    maxPlayers: game.max_players,
    randomSlots: game.random_slots,
    registrationWindowStart: game.registration_window_start,
    registrationWindowEnd: game.registration_window_end,
    teamAnnouncementTime: game.team_announcement_time,
    gameNumber: game.game_number,
    scoreBlue: game.score_blue,
    scoreOrange: game.score_orange,
    outcome: game.outcome as GameOutcome,
    venue: game.venue,
    gameRegistrations: game.game_registrations?.map(reg => ({
      id: reg.id,
      gameId: reg.game_id,
      playerId: reg.player_id,
      status: reg.status as 'confirmed' | 'reserve' | 'dropped_out',
      team: reg.team as 'blue' | 'orange' | undefined,
      player: reg.player ? {
        id: reg.player.id,
        friendlyName: reg.player.friendly_name,
        hasDeclined: reg.player.has_declined || false,
        hasOffer: reg.player.has_offer || false
      } as Player : undefined
    }))
  }
}
