import { Player } from './player'

export interface TeamColorStats {
  id: string
  friendlyName: string
  teamFrequency: number
  team: 'blue' | 'orange'
  caps: number
  player?: Player
}

export interface TeamStats {
  id: string
  wins: number
  losses: number
  draws: number
  winRate: number
  team: 'blue' | 'orange'
  player: Player
}

export interface TeamStatsDBResponse {
  id: string
  wins: number
  losses: number
  draws: number
  win_rate: number
  team: string
  player_id: string
}

export const transformTeamStatsFromDB = (stats: TeamStatsDBResponse, player: Player): TeamStats => ({
  id: stats.id,
  wins: stats.wins,
  losses: stats.losses,
  draws: stats.draws,
  winRate: stats.win_rate,
  team: stats.team as 'blue' | 'orange',
  player
})
