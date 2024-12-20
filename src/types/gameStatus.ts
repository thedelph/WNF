import { Database } from './database'
import { GameStatus, GameOutcome, GAME_STATUSES } from './game'

// Type for game status mapping
export interface GameStatusMapping {
  upcoming: GameStatusRecord[]
  open: GameStatusRecord[]
  players_announced: GameStatusRecord[]
  teams_announced: GameStatusRecord[]
  completed: GameStatusRecord[]
}

// Type for the database row
export type GameStatusRow = Database['public']['Tables']['games']['Row']

// Type for the application-side record
export interface GameStatusRecord extends Omit<GameStatusRow, 'status' | 'outcome'> {
  status: GameStatus
  outcome?: GameOutcome
  upcoming: boolean
  open: boolean
  players_announced: boolean
  teams_announced: boolean
  completed: boolean
}

// Function to create an empty game status mapping
export const createEmptyGameStatusMapping = (): GameStatusMapping => ({
  upcoming: [],
  open: [],
  players_announced: [],
  teams_announced: [],
  completed: []
})

// Function to categorize game statuses
export const categorizeGameStatuses = (statuses: GameStatusRecord[]): GameStatusMapping => {
  const mapping = createEmptyGameStatusMapping()
  
  statuses.forEach(status => {
    if (status.upcoming) mapping.upcoming.push(status)
    if (status.open) mapping.open.push(status)
    if (status.players_announced) mapping.players_announced.push(status)
    if (status.teams_announced) mapping.teams_announced.push(status)
    if (status.completed) mapping.completed.push(status)
  })
  
  return mapping
}

// Function to transform database row to application record
export const transformGameStatusFromDB = (status: GameStatusRow): GameStatusRecord => {
  const gameStatus = status.status as GameStatus
  return {
    ...status,
    status: gameStatus,
    outcome: status.outcome as GameOutcome,
    upcoming: isGameUpcoming(gameStatus),
    open: isGameOpen(gameStatus),
    players_announced: isGamePlayersAnnounced(gameStatus),
    teams_announced: status.teams_announced,
    completed: isGameCompleted(gameStatus)
  }
}

// Utility functions for checking game status
export const isGameOpen = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.OPEN
}

export const isGameCompleted = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.COMPLETED
}

export const isGamePlayersAnnounced = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.PLAYERS_ANNOUNCED
}

export const areTeamsAnnounced = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.TEAMS_ANNOUNCED
}

export const isGameUpcoming = (status: GameStatus): boolean => {
  return status === GAME_STATUSES.UPCOMING
}
