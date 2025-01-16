import { Game, Notification, Player } from '../../../types/game'

export interface GameCompletionFormProps {
  game: Game
  onComplete: () => void
}

export interface PlayerWithTeam extends Player {
  team?: 'blue' | 'orange' | null
  status?: 'selected' | 'registered' | 'reserve_no_offer' | 'reserve_declined'
  payment_status?: 'unpaid' | 'marked_paid' | 'admin_verified'
}

export interface TeamSectionProps {
  players: PlayerWithTeam[]
  teamColor: 'blue' | 'orange' | null
  onTeamChange: (playerId: string, team: 'blue' | 'orange' | null) => void
  onStatusChange: (playerId: string, status: PlayerWithTeam['status']) => void
  onPaymentStatusChange: (playerId: string, status: 'unpaid' | 'marked_paid' | 'admin_verified') => void
  showUnassigned: boolean
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
