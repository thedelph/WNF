import { Game, Player } from '../../../../types/game'

export interface GameCompletionFormProps {
  game: Game
  onComplete: () => void
}

export interface PlayerWithTeam extends Player {
  team?: 'blue' | 'orange' | null
  selected?: boolean
  payment_status?: 'unpaid' | 'marked_paid' | 'admin_verified'
}

export interface TeamSectionProps {
  players: PlayerWithTeam[]
  teamColor: 'blue' | 'orange'
  onTeamChange: (playerId: string, team: 'blue' | 'orange' | null) => void
  onPlayerSelection: (playerId: string, selected: boolean) => void
  onPaymentStatusChange: (playerId: string, status: 'unpaid' | 'marked_paid' | 'admin_verified') => void
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
