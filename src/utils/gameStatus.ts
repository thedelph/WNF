import { GameStatus, GAME_STATUSES } from '../types/game'

export const STATUS_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  'upcoming': ['open'],
  'open': ['players_announced'],
  'players_announced': ['teams_announced'],
  'teams_announced': ['completed'],
  'completed': []
} as const

export const NEXT_STATUS: Record<GameStatus, GameStatus> = {
  'upcoming': 'open',
  'open': 'players_announced',
  'players_announced': 'teams_announced',
  'teams_announced': 'completed',
  'completed': 'completed'
} as const

export const getNextStatus = (currentStatus: GameStatus): GameStatus => {
  return NEXT_STATUS[currentStatus]
}

export const isValidTransition = (from: GameStatus, to: GameStatus): boolean => {
  return STATUS_TRANSITIONS[from].includes(to)
}

export const isGameOpen = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.OPEN
}

export const isGamePlayersAnnounced = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.PLAYERS_ANNOUNCED
}

export const isGameTeamsAnnounced = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.TEAMS_ANNOUNCED
}

export const isGameCompleted = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.COMPLETED
}

export const isGameUpcoming = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.UPCOMING
}

export const canRegisterForGame = (status: GameStatus): boolean => {
  return [
    GAME_STATUSES.OPEN,
    GAME_STATUSES.PLAYERS_ANNOUNCED,
    GAME_STATUSES.TEAMS_ANNOUNCED
  ].includes(status)
}

export const isValidGameStatus = (status: string): status is GameStatus => {
  return Object.values(GAME_STATUSES).includes(status as GameStatus)
}
