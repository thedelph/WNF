// Types shared across PlayerCard components
export interface PlayerCardProps {
  id: string
  friendlyName: string
  xp: number
  caps: number
  activeBonuses: number
  activePenalties: number
  winRate: number
  wins?: number
  draws?: number
  losses?: number
  totalGames?: number
  currentStreak: number
  maxStreak: number
  benchWarmerStreak?: number
  rarity?: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary' | 'Retired' | 'Academy'
  avatarSvg?: string
  isRandomlySelected?: boolean
  status?: string
  hasSlotOffer?: boolean
  slotOfferStatus?: string
  slotOfferExpiresAt?: string
  slotOfferAvailableAt?: string
  potentialOfferTimes?: string[]
  hasActiveSlotOffers?: boolean
  whatsapp_group_member?: string
  children?: React.ReactNode
  rank?: number
  unpaidGames?: number
  unpaidGamesModifier?: number
  registrationStreakBonus?: number // Length of current registration streak
  registrationStreakBonusApplies?: boolean // Whether the bonus should be applied
  averagedPlaystyle?: string // Closest matching playstyle name based on averaged attributes
  playstyleMatchDistance?: number // Distance score for color coding (0-6, lower is better)
  playstyleCategory?: 'attacking' | 'midfield' | 'defensive' // Playstyle category
  playstyleRatingsCount?: number // Number of playstyle ratings contributing to the average
  shieldActive?: boolean // Whether player has active shield protection
  protectedStreakValue?: number | null // The original streak value when shield was activated (for gradual decay)
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null // Legacy alias for protectedStreakValue
  recentGames?: number // Number of games played in last 40 completed games (XP-relevant window)
  gameParticipation?: Array<'selected' | 'reserve' | 'dropped_out' | null> // Array of 40 elements showing participation status in each of the last 40 games (index 0 = oldest, 39 = most recent)
}

// Type alias for Player used in grid components
export type Player = PlayerCardProps

export interface PlayerCardModifiersProps {
  playerId?: string
  currentStreak: number
  streakModifier: number
  dropoutPenalties: number
  dropoutModifier: number
  activeBonuses: number
  bonusModifier: number
  activePenalties: number
  penaltyModifier: number
  benchWarmerStreak: number
  benchWarmerModifier: number
  unpaidGames: number
  unpaidGamesModifier: number
  registrationStreakBonus?: number
  registrationStreakBonusApplies?: boolean
  status?: string
  shieldActive?: boolean
  protectedStreakValue?: number | null // Original streak value for gradual decay
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null
}

export interface PlayerCardStatsProps {
  winRate: number
  wins: number
  draws: number
  losses: number
  totalGames: number
  shieldActive?: boolean
  protectedStreakValue?: number | null // Original streak value for gradual decay
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null
}

export interface PlayerCardBadgesProps {
  isRandomlySelected: boolean
  status?: string
  hasSlotOffer?: boolean
  slotOfferStatus?: string
  slotOfferExpiresAt?: string
  slotOfferAvailableAt?: string
  potentialOfferTimes?: string[]
  hasActiveSlotOffers?: boolean
  children?: React.ReactNode
}
