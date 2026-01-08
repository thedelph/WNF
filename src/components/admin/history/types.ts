import { Game, Player } from '../../../types/game'

// Re-export Player type for use by form components
export type { Player }

export interface GameCompletionFormProps {
  game: Game
  onComplete: () => void
}

export interface StatusChange {
  id: string
  player_id: string
  game_id: string
  from_status: string
  to_status: string
  change_type: 'dropout' | 'slot_offer' | 'slot_response'
  created_at: string
  is_game_day: boolean
  player?: {
    id: string
    friendly_name: string
  }
}

export type PlayerStatus = 'selected' | 'registered' | 'reserve' | 'reserve_declined' | 'dropped_out'

export interface PlayerWithTeam extends Player {
  team?: 'blue' | 'orange' | null
  status?: PlayerStatus
  payment_status?: 'unpaid' | 'marked_paid' | 'admin_verified'
  statusChanges?: StatusChange[]
}

export interface TeamSectionProps {
  players: PlayerWithTeam[]
  teamColor?: 'blue' | 'orange'
  showUnassigned?: boolean
  gameDate: Date
  onTeamChange: (playerId: string, team: 'blue' | 'orange' | null) => void
  onStatusChange: (playerId: string, status: PlayerStatus, changeDate: Date, isGameDay: boolean, wasReserve?: boolean) => void
  onPaymentStatusChange: (playerId: string, status: 'unpaid' | 'marked_paid' | 'admin_verified') => void
  onRemovePlayer: (playerId: string) => void
}

export interface ScoreInputProps {
  label: string
  value: number | undefined
  onChange: (value: number) => void
}

export interface GameOutcomeProps {
  outcome: string | undefined
  scoreBlue?: number
  scoreOrange?: number
  onChange: (value: string) => void
  isValid: boolean
}

// Historical Game Form Types
export interface ParsedGameInfo {
  date: string
  time: string
  gameNumber: number
  venue: string
  maxPlayers: number
  selectedPlayers: { name: string; xp: number }[]
  randomPlayers: { name: string; xp: number }[]
  reservePlayers: { name: string; xp: number }[]
}

export interface ParsedTeams {
  orangeTeam: string[]
  blueTeam: string[]
}

export interface TeamPlayer {
  id: string
  name: string
  selectionType?: 'merit' | 'random'
}

export interface ReservePlayer {
  id: string
  name: string
  isWhatsAppMember: boolean
}

export interface DropoutPlayer {
  id: string
  name: string
  reason?: string
}

export type GameOutcomeType = 'blue_win' | 'orange_win' | 'draw' | null
