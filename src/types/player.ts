import { Database } from './database'

export interface PlayerStats {
  id: string
  caps: number
  activeBonuses: number
  activePenalties: number
  currentStreak: number
  maxStreak: number
  dropoutPenalties: number
  winRate: number
  wins: number
  draws: number
  losses: number
  gamesPlayed: number
  averageAttack: number
  averageDefense: number
  rarity: PlayerRarity
  totalRatings?: number
  ratingsGiven?: number
  friendlyName: string
  avatarSvg: string
  hasDeclined: boolean
  hasOffer: boolean
}

export interface PlayerXPStats {
  caps: number
  activeBonuses: number
  activePenalties: number
  currentStreak: number
  dropoutPenalties: number
}

export interface Player {
  id: string
  friendlyName: string
  avatarSvg?: string
  stats: PlayerStats
  gamesPlayed: number
  averageAttack: number
  averageDefense: number
  winRate: number
  currentStreak: number
  maxStreak: number
  rarity: PlayerRarity
  preferredPosition?: string | null
  totalRatings?: number
  ratingsGiven?: number
}

export interface ExtendedPlayerData extends Player {
  hasSlotOffer: boolean
  hasDeclined: boolean
  slotOffers?: {
    id: string
    gameId: string
    playerId: string
    status: 'pending' | 'accepted' | 'declined'
    offeredAt: string
    respondedAt?: string
    createdAt: string
  }[]
}

export interface PlayerProfile extends Player {
  email?: string
  avatarUrl?: string
  avatarOptions?: string[]
}

export type PlayerRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'

export type GameOutcome = 'blue_win' | 'orange_win' | 'draw' | null

export interface PlayerGame {
  id: string
  date: string
  outcome: GameOutcome
  scoreBlue: number
  scoreOrange: number
  team?: 'blue' | 'orange'
}

export interface PlayerDBResponse {
  id: string
  friendly_name: string
  avatar_svg?: string
  games_played: number
  average_attack: number
  average_defense: number
  win_rate: number
  current_streak: number
  max_streak: number
  rarity: PlayerRarity
  total_ratings?: number
  ratings_given?: number
  preferred_position?: string | null
}

export function transformPlayerFromDB(player: PlayerDBResponse): Player {
  return {
    id: player.id,
    friendlyName: player.friendly_name,
    avatarSvg: player.avatar_svg,
    gamesPlayed: player.games_played,
    averageAttack: player.average_attack,
    averageDefense: player.average_defense,
    winRate: player.win_rate,
    currentStreak: player.current_streak,
    maxStreak: player.max_streak,
    rarity: player.rarity,
    preferredPosition: player.preferred_position,
    totalRatings: player.total_ratings,
    ratingsGiven: player.ratings_given,
    stats: {
      id: player.id,
      caps: player.games_played,
      activeBonuses: 0,
      activePenalties: 0,
      currentStreak: player.current_streak,
      maxStreak: player.max_streak,
      dropoutPenalties: 0,
      winRate: player.win_rate,
      wins: 0,
      draws: 0,
      losses: 0,
      gamesPlayed: player.games_played,
      averageAttack: player.average_attack,
      averageDefense: player.average_defense,
      rarity: player.rarity,
      totalRatings: player.total_ratings,
      ratingsGiven: player.ratings_given,
      friendlyName: player.friendly_name,
      avatarSvg: player.avatar_svg || '',
      hasDeclined: false,
      hasOffer: false
    }
  }
}
